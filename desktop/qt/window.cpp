#include "window.h"
#include "canvas.h"
#include <QtWidgets>
#include <QSvgRenderer>
#include <QSvgWidget>
#include <algorithm>

// Both the board and the floating palette use the same move and resize handling.
class Pane : public QFrame {
public:
    explicit Pane(QWidget *owner = nullptr) :
        QFrame(owner,(owner ? Qt::Tool : Qt::Window) | Qt::FramelessWindowHint) {
        setObjectName("pane");
        setStyleSheet("QFrame#pane,QFrame#title {background:#152238;border:1px solid #536e92;border-radius:6px}"
                      "QLabel,QToolButton {color:#e3efff} QToolButton {border:0;padding:4px}"
                      "QToolButton:checked,QToolButton:hover {background:#2e5072}");
        for (Qt::Edges edges : {Qt::Edges(Qt::LeftEdge),Qt::Edges(Qt::RightEdge),Qt::Edges(Qt::TopEdge),
                Qt::Edges(Qt::BottomEdge),Qt::LeftEdge|Qt::TopEdge,Qt::LeftEdge|Qt::BottomEdge,
                Qt::RightEdge|Qt::TopEdge,Qt::RightEdge|Qt::BottomEdge}) {
            auto grip = new QWidget(this);
            grip->setProperty("edges",int(edges));
            grip->installEventFilter(this);
            bool vertical = edges & (Qt::TopEdge|Qt::BottomEdge);
            bool horizontal = edges & (Qt::LeftEdge|Qt::RightEdge);
            auto cursor = vertical ? Qt::SizeVerCursor : Qt::SizeHorCursor;
            if (vertical && horizontal)
                cursor = (edges.testFlag(Qt::LeftEdge)==edges.testFlag(Qt::TopEdge)) ? Qt::SizeFDiagCursor : Qt::SizeBDiagCursor;
            grip->setCursor(cursor);
            grips.append(grip);
        }
    }

    QLabel *handle(const QString &title) {
        auto label = new QLabel(title,this);
        label->setContentsMargins(3,0,36,0);
        label->setCursor(Qt::CrossCursor);
        label->installEventFilter(this);
        return label;
    }
    std::function<void()> placed;

protected:
    void resizeEvent(QResizeEvent *e) override {
        QFrame::resizeEvent(e);
        QPainterPath path;
        path.addRoundedRect(QRectF(rect()),6,6);
        if (isFullScreen()) clearMask();
        else setMask(QRegion(path.toFillPolygon().toPolygon()));
        for (auto *grip : grips) {
            Qt::Edges edge(grip->property("edges").toInt());
            bool h = edge & (Qt::LeftEdge|Qt::RightEdge);
            bool v = edge & (Qt::TopEdge|Qt::BottomEdge);
            int w = h ? (v ? 10 : 4) : width()-20;
            int ht = v ? (h ? 10 : 4) : height()-20;
            grip->setGeometry(edge & Qt::RightEdge ? width()-w : (h ? 0 : 10),
                              edge & Qt::BottomEdge ? height()-ht : (v ? 0 : 10),w,ht);
            grip->setVisible(!isFullScreen());
            grip->raise();
        }
    }
    bool eventFilter(QObject *owner,QEvent *event) override {
        if (event->type()!=QEvent::MouseButtonPress && event->type()!=QEvent::MouseMove &&
            event->type()!=QEvent::MouseButtonRelease) return QFrame::eventFilter(owner,event);
        auto mouse = static_cast<QMouseEvent *>(event);
        auto p = mouse->globalPosition().toPoint();
        if (event->type()==QEvent::MouseButtonPress && mouse->button()==Qt::LeftButton && !isFullScreen()) {
            start = p;
            initial = geometry();
            edges = Qt::Edges(owner->property("edges").toInt());
            if (QGuiApplication::platformName().startsWith("wayland") && windowHandle()) {
                if (edges ? windowHandle()->startSystemResize(edges) : windowHandle()->startSystemMove()) start.reset();
            }
            return true;
        }
        if (!start) return false;
        if (event->type()==QEvent::MouseButtonRelease) {
            start.reset();
            if (placed) placed();
        } else {
            auto d = p - *start;
            QRect box = initial;
            if (!edges) box.translate(d);
            if (edges & Qt::LeftEdge) box.setLeft(std::min(initial.left()+d.x(),box.right()-minimumWidth()+1));
            if (edges & Qt::RightEdge) box.setRight(std::max(initial.right()+d.x(),box.left()+minimumWidth()-1));
            if (edges & Qt::TopEdge) box.setTop(std::min(initial.top()+d.y(),box.bottom()-minimumHeight()+1));
            if (edges & Qt::BottomEdge) box.setBottom(std::max(initial.bottom()+d.y(),box.top()+minimumHeight()-1));
            setGeometry(box);
        }
        return true;
    }

private:
    QList<QWidget *> grips;
    std::optional<QPoint> start;
    QRect initial;
    Qt::Edges edges;
};

class MethodButton : public QToolButton {
public:
    MethodButton(Canvas *canvas,const QJSValue &definition,const QString &lang,QWidget *owner) :
        QToolButton(owner), model(canvas), key(definition.property("action").toString()), language(lang) {
        const auto name = definition.property("alt").toString();
        auto hint = definition.property("hint");
        setText(name);
        setObjectName(key);
        setAttribute(Qt::WA_AcceptTouchEvents);
        setAttribute(Qt::WA_TabletTracking);
        setMouseTracking(true);
        hold.setSingleShot(true);
        hold.setInterval(model->call("holdMs").toInt());
        connect(&hold,&QTimer::timeout,this,[this]{ if (gesture("hold",device) == "secondary") suppressMenu = true; setDown(false); });
        penHint.setSingleShot(true);
        penHint.setInterval(450);
        connect(&penHint,&QTimer::timeout,this,[this]{ if (isVisible()) showHint(); });
        setAccessibleName(name);
        setToolTip(hint.isArray() ? hint.toVariant().toStringList().join(" → ") : name);
        QByteArray svg = definition.property("svg").toString().replace("currentColor","#e3efff").toUtf8();
        QSvgRenderer renderer(svg);
        if (renderer.isValid()) {
            QPixmap pixels(48,48);
            pixels.fill(Qt::transparent);
            QPainter paint(&pixels);
            renderer.render(&paint);
            setIcon(QIcon(pixels));
            setIconSize(QSize(20,20));
        } else setToolButtonStyle(Qt::ToolButtonTextOnly);
        if (definition.property("visual").isObject()) {
            tip = new QFrame(this,Qt::ToolTip);
            auto layout = new QVBoxLayout(tip);
            layout->addWidget(new QLabel(toolTip(),tip));
            graphic = new QSvgWidget(tip);
            graphic->setFixedSize(250,175);
            layout->addWidget(graphic);
            connect(&animation,&QTimer::timeout,this,[this] { paintHint(); });
        }
    }
protected:
    bool event(QEvent *e) override {
        const auto type = e->type();
        if (type == QEvent::ToolTip && tip) { showHint(); return true; }
        if (type == QEvent::FocusIn) {
            const auto reason = static_cast<QFocusEvent *>(e)->reason();
            if (reason == Qt::TabFocusReason || reason == Qt::BacktabFocusReason || reason == Qt::ShortcutFocusReason) {
                gesture("focus","keyboard");
                showHint();
            }
        }
        if (type == QEvent::Leave || type == QEvent::Hide || type == QEvent::FocusOut ||
            type == QEvent::MouseButtonPress || type == QEvent::KeyPress) {
            animation.stop();
            penHint.stop();
            penHover.reset();
            if (tip) tip->hide();
        }
        if ((type == QEvent::UngrabMouse || type == QEvent::Hide || type == QEvent::TouchCancel) && !device.isEmpty())
            pointer("cancel",device,{});
        if (type == QEvent::Enter) gesture("hover","mouse");
        if (type == QEvent::TouchBegin || type == QEvent::TouchUpdate || type == QEvent::TouchEnd) {
            auto touch = static_cast<QTouchEvent *>(e);
            if (type == QEvent::TouchBegin && !touch->points().isEmpty()) touchId = touch->points().first().id();
            for (const auto &point : touch->points()) {
                if (point.id() != touchId) continue;
                if (type == QEvent::TouchBegin) pointer("down","touch",point.position());
                else if (device == "touch")
                    pointer(point.state() == QEventPoint::State::Released ? "up" : "move","touch",point.position());
                break;
            }
            e->accept();
            return true;
        }
        if (type == QEvent::TabletPress || type == QEvent::TabletMove || type == QEvent::TabletRelease) {
            auto pen = static_cast<QTabletEvent *>(e);
            if (type == QEvent::TabletMove && device.isEmpty()) {
                const auto position = pen->position().toPoint();
                if (!penHover || (position - *penHover).manhattanLength() > 5) {
                    penHover = position;
                    penHint.start();
                }
                gesture("hover","pen");
            } else pointer(type == QEvent::TabletPress ? "down" : type == QEvent::TabletRelease ? "up" : "move",
                           "pen",pen->position());
            e->accept();
            return true;
        }
        if (type == QEvent::MouseButtonPress || type == QEvent::MouseButtonRelease || type == QEvent::MouseMove) {
            auto mouse = static_cast<QMouseEvent *>(e);
            if (type == QEvent::MouseButtonPress && mouse->button() == Qt::RightButton) {
                gesture("secondary","mouse");
                suppressMenu = true;
                return true;
            }
            if (type == QEvent::MouseMove && device == "mouse") { pointer("move","mouse",mouse->position()); return true; }
            if (mouse->button() == Qt::LeftButton) {
                pointer(type == QEvent::MouseButtonPress ? "down" : "up","mouse",mouse->position());
                return true;
            }
        }
        if (type == QEvent::ContextMenu) {
            const bool keyboard = static_cast<QContextMenuEvent *>(e)->reason() == QContextMenuEvent::Keyboard;
            if (!suppressMenu) gesture(keyboard ? "menu" : "secondary",keyboard ? "keyboard" : "mouse");
            suppressMenu = false;
            return true;
        }
        if (type == QEvent::KeyPress) {
            auto keyEvent = static_cast<QKeyEvent *>(e);
            auto keyCode = keyEvent->key();
            if (keyCode == Qt::Key_Menu || (keyCode == Qt::Key_F10 && keyEvent->modifiers().testFlag(Qt::ShiftModifier))) {
                if (!keyEvent->isAutoRepeat()) gesture("menu","keyboard");
                return true;
            }
            if (keyCode == Qt::Key_Return || keyCode == Qt::Key_Enter || keyCode == Qt::Key_Space) {
                if (!keyEvent->isAutoRepeat()) { gesture("activate","keyboard"); click(); }
                return true;
            }
        }
        return QToolButton::event(e);
    }
private:
    QString gesture(QString phase, QString input, QPointF point = {}) {
        auto result = model->call("buttonGesture",{key,phase,input,point.x(),point.y()});
        return result.isString() ? result.toString() : QString();
    }
    void pointer(QString phase, QString input, QPointF point) {
        if (phase == "down") {
            device = input;
            suppressMenu = false;
            penHint.stop();
            setDown(true);
            if (input != "mouse") hold.start();
        }
        const auto result = gesture(phase,input,point);
        if (result == "secondary" || result == "drag") { hold.stop(); setDown(false); }
        if (result == "secondary") suppressMenu = true;
        if (phase == "up" || phase == "cancel") {
            hold.stop();
            device.clear();
            setDown(false);
            if (result == "primary" && rect().contains(point.toPoint())) click();
        }
    }
    void showHint() {
        if (!tip || tip->isVisible()) return;
        clock.restart();
        paintHint();
        tip->adjustSize();
        auto area = screen()->availableGeometry();
        auto where = mapToGlobal(QPoint(0,height()+4));
        where.setX(qBound(area.left(),where.x(),std::max(area.left(),area.right()-tip->width()+1)));
        if (where.y()+tip->height()>area.bottom()) where.setY(std::max(area.top(),mapToGlobal(QPoint()).y()-tip->height()-4));
        tip->move(where);
        tip->show();
        animation.start(40);
    }
    QTimer hold, penHint;
    std::optional<QPoint> penHover;
    QString device;
    int touchId = -1;
    bool suppressMenu = false;
    void paintHint() {
        graphic->load(model->call("helpFrame",{key,language,(clock.elapsed()%4200)/4200.0}).toString().toUtf8());
    }
    Canvas *model;
    QString key, language;
    QFrame *tip = nullptr;
    QSvgWidget *graphic = nullptr;
    QElapsedTimer clock;
    QTimer animation;
};

class Window final : public Pane {
public:
    Window() {
        setWindowTitle("ChipDraw");
        setMinimumSize(350,220);
        resize(960,680);
        canvas = new Canvas(this);
        auto title = new QFrame(this);
        title->setObjectName("title");
        auto strip = new QHBoxLayout(title);
        strip->setContentsMargins(3,2,2,2);
        auto closeButton = button("pane.close",title);
        connect(closeButton,&QToolButton::clicked,this,&QWidget::close);
        strip->addWidget(closeButton);
        strip->addWidget(handle("ChipDraw"));
        title->adjustSize();
        palette = new Pane(this);
        palette->setMinimumSize(180,84);
        auto layout = new QVBoxLayout(palette);
        auto bar = new QHBoxLayout;
        layout->addLayout(bar);
        bar->addWidget(palette->handle(canvas->call("text",{"rect.title",language}).toString()),1);
        auto pan = button("canvas.pan",palette);
        pan->setCheckable(true);
        connect(pan,&QToolButton::clicked,canvas,&Canvas::pan);
        bar->addWidget(pan);
        auto hide = button("panel.close",palette);
        connect(hide,&QToolButton::clicked,palette,&QWidget::hide);
        bar->addWidget(hide);
        auto row = new QHBoxLayout;
        layout->addLayout(row);
        auto group = new QButtonGroup(palette);
        auto methods = canvas->call("methods",{language});
        for (int i=0; i<methods.property("length").toInt(); ++i) {
            auto def = methods.property(i);
            QString method = def.property("action").toString();
            auto tool = new MethodButton(canvas,def,language,palette);
            tool->setCheckable(true);
            tool->setChecked(method=="diagonal");
            group->addButton(tool);
            row->addWidget(tool);
            connect(tool,&QToolButton::clicked,this,[this,pan,method] { pan->setChecked(false); canvas->choose(method); });
        }
        palette->adjustSize();
        palette->placed = [this] {
            if (frameGeometry().contains(palette->frameGeometry())) offset = palette->pos()-pos();
            else offset.reset();
        };
        canvas->setContextMenuPolicy(Qt::CustomContextMenu);
        connect(canvas,&QWidget::customContextMenuRequested,this,[this](QPoint point) {
            if (offset) { offset = point; follow(); }
            palette->show();
            palette->raise();
        });
        canvas->setAccessibleDescription(canvas->call("text",{"canvas.help",language}).toString());
        shortcut(QKeySequence(Qt::Key_Escape),"cancel");
        shortcut(QKeySequence::Undo,"undo");
        shortcut(QKeySequence::Redo,"redo");
    }
protected:
    void resizeEvent(QResizeEvent *e) override {
        if (canvas) canvas->setGeometry(rect());
        Pane::resizeEvent(e);
        follow();
    }
    void moveEvent(QMoveEvent *e) override { Pane::moveEvent(e); follow(); }

private:
    void shortcut(QKeySequence keys,QString command) {
        auto action = new QShortcut(keys,this);
        connect(action,&QShortcut::activated,canvas,[this,command]{ canvas->command(command); });
    }
    MethodButton *button(QString key,QWidget *parent) {
        return new MethodButton(canvas,canvas->call("button",{key,language}),language,parent);
    }
    void follow() {
        if (!palette || !offset) return;
        if (width()<palette->width() || height()<palette->height()) { offset.reset(); return; }
        offset = QPoint(qBound(0,offset->x(),width()-palette->width()),qBound(0,offset->y(),height()-palette->height()));
        palette->move(pos()+*offset);
    }
    QString language = QLocale().bcp47Name();
    Canvas *canvas = nullptr;
    Pane *palette = nullptr;
    std::optional<QPoint> offset = QPoint();
};
std::unique_ptr<QWidget> createWindow() { return std::make_unique<Window>(); }
