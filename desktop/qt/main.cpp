#include "native.h"
#include <memory>
#include <iostream>

int main(int argc,char **argv) {
#ifdef Q_OS_LINUX
    if (qEnvironmentVariableIsEmpty("QT_QPA_PLATFORM") && !qEnvironmentVariableIsEmpty("DISPLAY"))
        qputenv("QT_QPA_PLATFORM","xcb");
#endif
    QApplication app(argc,argv);
    app.setOrganizationName("ChipChip");
    app.setApplicationName("ChipChip");
    QCommandLineParser parser;
    parser.addHelpOption();
    parser.addOption({"app","chipdraw, chipchip or pinview","app","chipdraw"});
    parser.addOption({"file","Open PinView JSON","file"});
    parser.addOption({"native-rectangle","Open the native drawing workspace"});
    parser.addOption({"web-baseline","Open the generated HTML in the desktop browser"});
    parser.addOption({"smoke-test","Exercise native workspaces and shared models"});
    parser.process(app);
    try {
        if (parser.isSet("smoke-test")) {
            testInputs(); testDrawing(); testPins();
            std::cout<<"PASS native inputs, ChipDraw and PinView\n";
            return 0;
        }
        auto name=parser.value("app");
        if (name!="chipdraw" && name!="chipchip" && name!="pinview") parser.showHelp(2);
        if(parser.isSet("file")&&name!="pinview")parser.showHelp(2);
        if(parser.isSet("web-baseline")){
            QDir dir(QCoreApplication::applicationDirPath());
            const QString file=name=="pinview"?"PinView.html":"ChipChip.html";
            while(!QFileInfo::exists(dir.filePath(file))){
                if(!dir.cdUp())throw std::runtime_error("Build the HTML entry with node tools/build.mjs first");
            }
            return QDesktopServices::openUrl(QUrl::fromLocalFile(dir.filePath(file)))?0:1;
        }
        std::unique_ptr<QWidget> window(name=="pinview"?pinWindow(parser.value("file")):drawingWindow());
        window->show();
        return app.exec();
    } catch (const std::exception &error) {
        std::cerr<<error.what()<<'\n';
        return 1;
    }
}
