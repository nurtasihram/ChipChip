#include "sliders.h"
#include <QtTest/QTest>
#include <cmath>

BoundSlider::BoundSlider(QString kind,QString label,double minimum,double maximum,int step,QWidget *parent)
 : QWidget(parent),low(minimum),high(maximum),divisions(step){
    if(!std::isfinite(low)||!std::isfinite(high)||high<=low||step<0)
        throw std::invalid_argument("Invalid slider range or divisions");
    bool physical=kind!="integer"&&kind!="decimal";
    if(physical&&!QStringList{"length","area","angle","time"}.contains(kind))
        throw std::invalid_argument("Invalid slider quantity kind");
    if(kind=="integer"&&(low!=std::trunc(low)||high!=std::trunc(high)))
        throw std::invalid_argument("Integer sliders require integer bounds");
    auto layout=new QVBoxLayout(this);layout->setContentsMargins(0,0,0,0);
    controls=new QWidget(this);auto row=new QHBoxLayout(controls);row->setContentsMargins(0,0,0,0);
    rail=new QSlider(Qt::Horizontal,controls);rail->setFocusPolicy(Qt::StrongFocus);
    rail->setMinimumWidth(0);rail->setAccessibleName(label);row->addWidget(rail,1);
    auto link=[&]{
        auto button=new QToolButton(controls);button->setAutoRaise(true);
        auto font=button->font();font.setUnderline(true);button->setFont(font);
        button->setCursor(Qt::PointingHandCursor);row->addWidget(button);return button;
    };
    valueLink=link();valueLink->setAccessibleName(label);
    unitLink=link();unitLink->setVisible(physical);layout->addWidget(controls);
    input=new BoundInput(kind,label,physical,this);layout->addWidget(input);input->hide();
    setFocusProxy(rail);rail->installEventFilter(this);
    for(QWidget *w:QList<QWidget*>{controls,valueLink,unitLink})w->installEventFilter(this);
    connect(rail,&QSlider::valueChanged,this,[this](int pos){adjust(pos,true);});
    connect(valueLink,&QToolButton::clicked,this,[this]{
        editing=!editing;arrange();
        if(editing){input->refresh();input->editor()->setFocus();input->editor()->selectAll();}
    });
    connect(unitLink,&QToolButton::clicked,this,[this]{
        auto units=input->spec.property("units").toVariant().toStringList();
        if(units.size()<2)return;
        auto index=units.indexOf(input->spec.property("unit").toString());
        input->unit=units[(index+1)%units.size()];input->refresh();sync();
    });
    input->validate=[this](const QJSValue &value){
        double n=amount(value);
        if(!std::isfinite(n)||n<low||n>high)throw std::out_of_range("數值超出滑動條範圍");
    };
    input->committed=[this]{editing=false;sync();if(onChange)onChange();};
    setEnabled(false);
}
int BoundSlider::steps()const{return divisions>1?divisions:qMax(1,rail->width());}
double BoundSlider::amount(const QJSValue &value)const{
    return input->physical?input->script.call("sliderAmount",{input->kind,value,rangeUnit}).toNumber():value.toNumber();
}
void BoundSlider::bind(QJSValue object,QString key){
    auto value=object.property(key);
    rangeUnit=input->physical?value.property("unit").toString():QString();
    input->validate(value);editing=false;
    if(rail->isSliderDown())discardDrag=true;
    {QSignalBlocker block(rail);rail->setSliderDown(false);}
    input->bind(object,key);setEnabled(true);sync();
}
void BoundSlider::configure(QVariantMap settings){input->configure(settings);sync();}
void BoundSlider::refresh(){if(input->object.isObject()){input->refresh();sync();}}
void BoundSlider::adjust(int ticks,bool absolute){
    if(!isEnabled()||!input->object.isObject())return;
    auto old=input->object.property(input->key);double before=amount(old);
    if(!absolute&&((ticks>0&&before>=high)||(ticks<0&&before<=low)))return;
    int count=steps();
    try{
        QJSValue next;
        if(input->physical)
            next=input->script.call("sliderRecord",{input->kind,old,rangeUnit,low,high,count,ticks,absolute});
        else{
            double increment=(high-low)/count;
            if(!absolute&&input->kind=="integer")increment=qMax(1.,std::round(increment));
            double n=(absolute?low:before)+ticks*increment;
            if(input->kind=="integer")n=std::round(n);
            next=qBound(low,n,high);
        }
        if(amount(next)!=before){
            input->object.setProperty(input->key,next);input->refresh();sync();if(onChange)onChange();
        }else sync();
    }catch(const std::exception &e){sync();rail->setToolTip(QString::fromUtf8(e.what()));}
}
void BoundSlider::sync(){
    if(!input->object.isObject())return;
    auto value=input->object.property(input->key);int count=steps();
    QSignalBlocker block(rail);rail->setRange(0,count);
    rail->setValue(qRound(qBound(0.,(amount(value)-low)/(high-low),1.)*count));
    if(input->physical){
        auto fields=input->initial;auto mode=input->spec.property("mode").toString();
        if(mode=="clock"){
            auto parts=input->spec.property("parts").toVariant().toStringList();
            for(int i=0;i<fields.size();++i)fields[i]+=parts.value(i);
        }
        valueLink->setText(fields.join(mode=="fraction"?"/":" "));
        unitLink->setText(input->spec.property("unit").toString());
    }else valueLink->setText(value.toString());
    arrange();
}
void BoundSlider::arrange(){
    bool compact=width()<rail->sizeHint().width()+valueLink->sizeHint().width()
        +(input->physical?unitLink->sizeHint().width():0)+2*controls->layout()->spacing();
    controls->setVisible(!compact);input->setVisible(compact||editing);
}
void BoundSlider::resizeEvent(QResizeEvent *e){QWidget::resizeEvent(e);arrange();}
bool BoundSlider::eventFilter(QObject *source,QEvent *e){
    if(source==rail&&discardDrag){
        if(e->type()==QEvent::MouseButtonRelease){discardDrag=false;return false;}
        if(e->type()==QEvent::MouseMove)return true;
        if(e->type()==QEvent::MouseButtonPress)discardDrag=false;
    }
    if(source==rail&&e->type()==QEvent::Resize){sync();return false;}
    if(e->type()==QEvent::Wheel){
        auto wheel=static_cast<QWheelEvent*>(e);
        if(wheel->modifiers()&(Qt::ControlModifier|Qt::MetaModifier)){wheel->ignore();return true;}
        int y=wheel->angleDelta().y();if(!y)y=wheel->pixelDelta().y();
        if(!y){wheel->ignore();return true;}
        adjust(y>0?1:-1,false);wheel->accept();return true;
    }
    if(source==rail&&e->type()==QEvent::KeyPress){
        int key=static_cast<QKeyEvent*>(e)->key();
        if(key==Qt::Key_Left||key==Qt::Key_Right){adjust(key==Qt::Key_Right?1:-1,false);return true;}
    }
    return QWidget::eventFilter(source,e);
}

void testSliders(){
    for(int divisions:{0,1,4}){
        BoundSlider slider("decimal","純量",-20,100,divisions);
        auto obj=slider.engine().newObject();obj.setProperty("v",1.5);slider.bind(obj,"v");
        slider.resize(360,60);slider.show();QApplication::processEvents();
        auto rail=slider.findChild<QSlider*>();rail->setFixedWidth(120);QApplication::processEvents();
        auto wheel=[&](int delta){QWheelEvent e(QPointF(20,5),rail->mapToGlobal(QPoint(20,5)),{},QPoint(0,delta),
            Qt::NoButton,Qt::NoModifier,Qt::NoScrollPhase,false);QApplication::sendEvent(rail,&e);};
        rail->clearFocus();wheel(120);
        if(rail->hasFocus()||obj.property("v").toNumber()!=(divisions==4?31.5:2.5))throw std::runtime_error("Hover step");
        rail->setFocus();QTest::keyClick(rail,Qt::Key_Left);
        if(obj.property("v").toNumber()!=1.5)throw std::runtime_error("Keyboard step");
        obj.setProperty("v",99.75);slider.refresh();wheel(120);wheel(120);
        if(obj.property("v").toNumber()!=100)throw std::runtime_error("Slider upper bound");
    }
    BoundSlider length("length","長度",0,1,3);
    auto obj=Script::checked(length.engine().evaluate("({v:{unit:'mm',value:0}})"));
    length.bind(obj,"v");length.resize(360,60);length.show();QApplication::processEvents();
    auto rail=length.findChild<QSlider*>();rail->setFocus();QTest::keyClick(rail,Qt::Key_Right);
    auto old=obj.property("v");auto ratio=old.property("rational");
    if(ratio.property("numerator").toInt()!=1||ratio.property("denominator").toInt()!=3)
        throw std::runtime_error("Physical slider exact step");
    auto unitButton=length.findChildren<QToolButton*>().front();
    for(auto button:length.findChildren<QToolButton*>())if(button->text()=="mm"&&button->isVisible())unitButton=button;
    unitButton->click();
    if(unitButton->text()=="mm"||!obj.property("v").strictlyEquals(old))
        throw std::runtime_error("Display unit switch changed physical value");
    length.resize(70,60);QApplication::processEvents();
    QLineEdit *draft=nullptr;
    for(auto line:length.findChildren<QLineEdit*>())if(line->isVisible())draft=line;
    if(!rail->isHidden() && rail->isVisible())throw std::runtime_error("Compact slider still visible");
    if(!draft)throw std::runtime_error("Missing compact input");
    draft->setText("777");
    auto second=Script::checked(length.engine().evaluate("({v:{unit:'mm',value:1}})"));length.bind(second,"v");
    draft->returnPressed();
    if(second.property("v").property("value").toNumber()!=1)throw std::runtime_error("Stale slider editor committed");
    length.resize(360,60);QApplication::processEvents();rail->setFocus();
    QTest::keyClick(rail,Qt::Key_Left);
    if(!obj.property("v").strictlyEquals(old)||second.property("v").property("rational").property("numerator").toInt()!=2)
        throw std::runtime_error("Physical slider rebind");
}
