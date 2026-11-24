#pragma once
#include <QGraphicsView>
#include <QJSEngine>
#include <optional>

class Canvas final : public QGraphicsView {
public:
    explicit Canvas(QWidget *parent = nullptr);
    QJSValue call(const QString &method, const QJSValueList &args = {});
    void command(const QString &name);
    void choose(const QString &name);
    void pan(bool enabled);

protected:
    void mousePressEvent(QMouseEvent *) override;
    void mouseReleaseEvent(QMouseEvent *) override;
    void mouseMoveEvent(QMouseEvent *) override;
    void wheelEvent(QWheelEvent *) override;
    void keyPressEvent(QKeyEvent *) override;
    bool event(QEvent *) override;

private:
    QJSEngine engine;
    QJSValue session;
    QJSValue worldPoint(QMouseEvent *);
    QGraphicsPolygonItem *polygon(const QJSValue &, bool);
    void preview(const QJSValue &);
    void apply(const QJSValue &);
    QString method = QStringLiteral("diagonal");
    QHash<QString,QGraphicsPolygonItem *> objects;
    QGraphicsPolygonItem *ghost = nullptr;
    std::optional<QPointF> press;
    bool first = false;
};
