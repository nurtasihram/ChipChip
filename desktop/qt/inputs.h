#pragma once
#include "native.h"

class BoundInput : public QWidget {
    Script script;
    QString kind, label, key, unit;
    bool physical;
    QJSValue object, settings;
    QHBoxLayout box;
    QWidget *row=nullptr;
    QList<QLineEdit*> fields;
    QJSValue spec;
    QStringList initial;
    void refresh();
    friend class BoundSlider;
    std::function<void(const QJSValue&)> validate;
    std::function<void()> committed;
public:
    BoundInput(QString kind,QString label,bool physical=false,QWidget *parent=nullptr);
    void bind(QJSValue object,QString key);
    void configure(QVariantMap values);
    bool commit(QString targetUnit={});
    QJSEngine &engine(){return script.engine;}
    QLineEdit *editor()const{return fields.value(0);}
};
