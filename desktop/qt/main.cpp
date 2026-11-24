#include "window.h"
#include <QApplication>
#include <QMessageBox>
#include <exception>

int main(int argc,char **argv) {
    QApplication app(argc,argv);
    app.setApplicationName("ChipDraw");
    app.setOrganizationName("ChipChip");
    try {
        auto window = createWindow();
        window->show();
        return app.exec();
    } catch (const std::exception &error) {
        QMessageBox::critical(nullptr,"ChipDraw",QString::fromUtf8(error.what()));
        return 1;
    }
}
