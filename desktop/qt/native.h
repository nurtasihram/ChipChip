#pragma once
#include <QtWidgets>
#include <QJSEngine>
#include <QSvgRenderer>
#include <stdexcept>

inline QByteArray readFile(const QString &path) {
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) throw std::runtime_error(file.errorString().toStdString());
    return file.readAll();
}

class Script {
public:
    QJSEngine engine;
    QJSValue model;
    static QJSValue checked(QJSValue value) {
        if (value.isError()) throw std::runtime_error(value.toString().toStdString());
        return value;
    }
    explicit Script(const QString &path) {
        checked(engine.evaluate(QString::fromUtf8(readFile(path)),path));
    }
    QJSValue parse(const QByteArray &data) {
        return checked(engine.globalObject().property("JSON").property("parse").call({QString::fromUtf8(data)}));
    }
    QJSValue call(const QString &name,QJSValueList args={}) {
        return checked(model.property(name).callWithInstance(model,args));
    }
};

constexpr auto drawingBundle=":/desktop/qt/chipdraw-model.generated.js";
QWidget *drawingWindow();
void testDrawing();
void testInputs();
