#include "canvas.h"
#include "window.h"
#include <QApplication>
#include <QContextMenuEvent>
#include <QTest>
#include <QToolButton>
#include <QDebug>

int main(int argc, char **argv) {
    QApplication app(argc, argv);
    auto window = createWindow();
    window->show();
    app.processEvents();
    auto canvas = dynamic_cast<Canvas *>(window->findChild<QGraphicsView *>());
    if (!canvas || !canvas->isVisible()) return 1;
    auto board = canvas->viewport();
    auto document = [&]{ return canvas->call("document").property("items"); };
    auto count = [&]{ return document().property("length").toInt(); };
    auto click = [&](QPoint point){ QTest::mouseClick(board, Qt::LeftButton, {}, point); };
    auto id = [&](int i){ return document().property(i).property("id").toString(); };

    click({150,150});
    canvas->command("cancel");
    if (count() || canvas->call("active").toBool()) return 2;
    click({160,140});
    click({200,170});
    if (count()!=1 || canvas->scene()->items().size()!=1) return 3;
    const auto firstId = id(0);
    canvas->command("undo");
    if (count() || !canvas->scene()->items().isEmpty()) return 4;
    canvas->command("redo");
    if (count()!=1 || id(0)!=firstId) return 5;
    QTest::mousePress(board, Qt::LeftButton, {}, QPoint(180,120));
    QTest::mouseMove(board, QPoint(240,200));
    QTest::mouseRelease(board, Qt::LeftButton, {}, QPoint(240,200));
    if (count()!=2 || canvas->scene()->items().size()!=2) return 6;

    QContextMenuEvent open(QContextMenuEvent::Mouse, QPoint(40,40), board->mapToGlobal(QPoint(40,40)));
    QApplication::sendEvent(board, &open);
    app.processEvents();
    for (const QString method : {"edge","right-triangle","edge-midpoint","diagonal"}) {
        auto button = window->findChild<QToolButton *>(method);
        if (!button || !button->isVisible()) return 7;
        QTest::mouseClick(button, Qt::LeftButton);
        if (!button->isChecked()) return 8;
        const int before = count();
        click({170,180});
        click({230,210});
        if (method == "edge" || method == "right-triangle") click({210,240});
        if (count()!=before+1 || canvas->call("active").toBool()) {
            qWarning() << method << "did not complete";
            return 9;
        }
    }
    auto pan = window->findChild<QToolButton *>("canvas.pan");
    QTest::mouseClick(pan, Qt::LeftButton);
    if (canvas->dragMode()!=QGraphicsView::ScrollHandDrag) return 10;
    QTest::mouseClick(pan, Qt::LeftButton);
    if (canvas->dragMode()!=QGraphicsView::NoDrag) return 11;
    return 0;
}
