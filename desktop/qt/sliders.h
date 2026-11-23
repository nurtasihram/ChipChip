#pragma once
#include "inputs.h"

// Scalar kinds are integer and decimal. Physical kinds use ChipPhysical quantity records.
// Minimum and maximum refer to the quantity unit at bind time.
class BoundSlider final : public QWidget {
    BoundInput *input;
    QWidget *controls;
    QSlider *rail;
    QToolButton *valueLink,*unitLink;
    QString rangeUnit;
    double low,high;
    int divisions;
    bool editing=false,discardDrag=false;
    int steps() const;
    double amount(const QJSValue &value) const;
    void adjust(int ticks,bool absolute);
    void sync();
    void arrange();
    bool eventFilter(QObject *source,QEvent *event) override;
    void resizeEvent(QResizeEvent *event) override;
public:
    BoundSlider(QString kind,QString label,double minimum,double maximum,int step=0,QWidget *parent=nullptr);
    QJSEngine &engine(){return input->engine();}
    void bind(QJSValue object,QString key);
    void configure(QVariantMap settings);
    void refresh();
    std::function<void()> onChange;
};
void testSliders();
