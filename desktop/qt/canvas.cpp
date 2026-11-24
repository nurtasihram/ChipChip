#include "canvas.h"
#include <QFile>
#include <QGraphicsPolygonItem>
#include <QKeyEvent>
#include <QMouseEvent>
#include <QWheelEvent>
#include <stdexcept>

static QJSValue checked(QJSValue value) {
    if (value.isError())
        throw std::runtime_error(value.property("stack").toString().prepend(value.toString() + "\n").toStdString());
    return value;
}

Canvas::Canvas(QWidget *parent) : QGraphicsView(parent) {
    Q_INIT_RESOURCE(model);
    QFile source(":/chipdraw-model.generated.js");
    if (!source.open(QIODevice::ReadOnly))
        throw std::runtime_error("Cannot open embedded drawing model");
    checked(engine.evaluate(QString::fromUtf8(source.readAll()), source.fileName()));
    session = checked(engine.evaluate("nativeRectangleSession()"));
    setScene(new QGraphicsScene(this));
    scene()->setSceneRect(-10000,-10000,20000,20000);
    setFrameShape(QFrame::NoFrame);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setBackgroundBrush(QColor("#101a2b"));
    setRenderHint(QPainter::Antialiasing);
    setMouseTracking(true);
    setFocusPolicy(Qt::StrongFocus);
    centerOn(0,0);
}

QJSValue Canvas::call(const QString &name, const QJSValueList &args) {
    return checked(session.property(name).callWithInstance(session,args));
}

QJSValue Canvas::worldPoint(QMouseEvent *e) {
    QPointF pos = mapToScene(e->position().toPoint());
    return engine.toScriptValue(QVariantList{pos.x(),-pos.y()});
}

QGraphicsPolygonItem *Canvas::polygon(const QJSValue &geometry, bool draft) {
    auto pos = geometry.property("point");
    double w = geometry.property("width").toNumber();
    double h = geometry.property("height").toNumber();
    QTransform pose;
    pose.translate(pos.property(0).toNumber(),-pos.property(1).toNumber());
    pose.rotate(-geometry.property("rotation").toNumber());
    QPolygonF rect{{0,0},{w,0},{w,h},{0,h}};
    return scene()->addPolygon(pose.map(rect), QPen(QColor(draft ? "#ffd166" : "#69b8ff"),2,
        draft ? Qt::DashLine : Qt::SolidLine));
}

void Canvas::preview(const QJSValue &p) {
    delete ghost;
    ghost = nullptr;
    auto geometry = call("preview",{p});
    if (geometry.isObject()) ghost = polygon(geometry,true);
}

void Canvas::apply(const QJSValue &change) {
    if (!change.isObject()) return;
    if (change.hasProperty("remove")) delete objects.take(change.property("remove").toString());
    else objects.insert(change.property("add").toString(),polygon(change.property("geometry"),false));
}

void Canvas::command(const QString &name) {
    press.reset();
    delete ghost;
    ghost = nullptr;
    apply(call(name));
}
void Canvas::choose(const QString &name) { pan(false); method = name; }
void Canvas::pan(bool enabled) {
    command("cancel");
    setDragMode(enabled ? ScrollHandDrag : NoDrag);
}

void Canvas::mousePressEvent(QMouseEvent *e) {
    if (dragMode() != NoDrag || e->button() != Qt::LeftButton) return QGraphicsView::mousePressEvent(e);
    press = e->position();
    first = !call("active").toBool();
    auto p = worldPoint(e);
    if (first) call("begin",{method,p,0});
    preview(p);
    e->accept();
}
void Canvas::mouseMoveEvent(QMouseEvent *e) {
    if (call("active").toBool()) preview(worldPoint(e));
    else QGraphicsView::mouseMoveEvent(e);
}
void Canvas::mouseReleaseEvent(QMouseEvent *e) {
    if (!press || e->button() != Qt::LeftButton) return QGraphicsView::mouseReleaseEvent(e);
    QPointF delta = e->position() - *press;
    press.reset();
    auto p = worldPoint(e);
    QJSValue change;
    if (!first || QPointF::dotProduct(delta,delta)>16) change = call("place",{p});
    if (change.isObject()) {
        delete ghost;
        ghost = nullptr;
        apply(change);
    } else preview(p);
    e->accept();
}

void Canvas::wheelEvent(QWheelEvent *e) { e->accept(); }
void Canvas::keyPressEvent(QKeyEvent *e) {
    if (e->key() >= Qt::Key_Home && e->key() <= Qt::Key_PageDown) e->accept();
    else QGraphicsView::keyPressEvent(e);
}
bool Canvas::event(QEvent *e) {
    if (e->type() == QEvent::WindowDeactivate && press) command("cancel");
    return QGraphicsView::event(e);
}
