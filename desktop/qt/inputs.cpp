#include "sliders.h"
#include <QtTest/QTest>

BoundInput::BoundInput(QString kind,QString label,bool physical,QWidget *parent)
 : QWidget(parent),script(physical?drawingBundle:":/shared/scalar-input.js"),kind(kind),label(label),physical(physical),box(this){
    script.model=script.engine.globalObject().property(physical?"ChipPhysical":"ChipScalar");
    settings=script.engine.newObject();box.setContentsMargins(0,0,0,0);
}
void BoundInput::configure(QVariantMap values){
    settings=script.engine.toScriptValue(values);unit.clear();if(object.isObject())refresh();
}
void BoundInput::bind(QJSValue value,QString property){
    object=value;key=property;unit.clear();refresh();
}
void BoundInput::refresh(){
    auto value=object.property(key);
    initial.clear();
    if(physical){
        spec=script.call("layout",{kind,settings,unit.isEmpty()?QJSValue(QJSValue::NullValue):QJSValue(unit),value});
        initial=script.call("display",{value,spec}).toVariant().toStringList();
    }else initial<<value.toString();
    if(row){row->setDisabled(true);row->hide();box.removeWidget(row);row->deleteLater();}
    fields.clear();
    if(physical){
        auto frame=new QFrame(this);
        frame->setObjectName("physicalInputFrame");
        frame->setStyleSheet("QFrame#physicalInputFrame { background:palette(base); border:1px solid palette(mid); border-radius:3px; }"
                             "QFrame#physicalInputFrame QLineEdit { background:transparent; border:0; }"
                             "QToolButton#physicalUnitLink { background:transparent; border:0; color:palette(link); padding:2px; }"
                             "QToolButton#physicalUnitLink:focus { outline:1px solid palette(highlight); }");
        row=frame;
    }else row=new QWidget(this);
    auto layout=new QHBoxLayout(row);
    layout->setContentsMargins(physical?4:0,physical?2:0,physical?4:0,physical?2:0);
    box.addWidget(row);
    auto generation=row;
    auto mode=spec.property("mode").toString();
    for(int i=0;i<initial.size();++i){
        auto line=new QLineEdit(initial[i],row);fields<<line;layout->addWidget(line,1);
        if(physical)line->setFrame(false);
        line->setAccessibleName(label+(physical?" "+spec.property("parts").property(i).toString():""));
        line->setContextMenuPolicy(Qt::CustomContextMenu);
        connect(line,&QWidget::customContextMenuRequested,line,[line](QPoint pos){
            auto menu=line->createStandardContextMenu();menu->setAttribute(Qt::WA_DeleteOnClose);menu->popup(line->mapToGlobal(pos));
        });
        connect(line,&QLineEdit::returnPressed,this,[this,generation]{if(row==generation)commit();});
        if(mode=="clock")layout->addWidget(new QLabel(spec.property("parts").property(i).toString(),row));
        if(mode=="ratio"){
            auto code=spec.property("ratioUnits").property(i?"denominatorUnit":"numeratorUnit");
            if(code.isString()&&!(i&&spec.property("units").isArray()))layout->addWidget(new QLabel(code.toString(),row));
        }
        if(i==0&&(mode=="ratio"||mode=="fraction"))layout->addWidget(new QLabel(mode=="ratio"||settings.property("fraction_style").toString()=="ratio"?":":"/",row));
    }
    if(!physical)return;
    auto units=spec.property("units").toVariant().toStringList();auto current=spec.property("unit");
    if(units.size()<2){
        if(mode=="ratio"&&units.isEmpty())current=spec.property("ratioUnits").property("unit");
        if(current.isString())layout->addWidget(new QLabel(current.toString(),row));return;
    }
    auto button=new QToolButton(row);
    button->setObjectName("physicalUnitLink");button->setText(current.toString());
    button->setAccessibleName(label+" 單位 "+current.toString());
    button->setToolTip("切換至下一個單位；右鍵選擇單位");
    button->setAutoRaise(true);button->setCursor(Qt::PointingHandCursor);
    auto font=button->font();font.setUnderline(true);button->setFont(font);
    layout->addWidget(button);
    connect(button,&QToolButton::clicked,this,[this,generation,button,units]{
        if(row!=generation)return;
        auto next=units[(units.indexOf(button->text())+1)%units.size()];
        bool focused=button->hasFocus();
        if(commit(next)&&focused){
            if(auto link=row->findChild<QToolButton*>("physicalUnitLink");link&&link->isVisible())link->setFocus();
        }
    });
    button->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(button,&QWidget::customContextMenuRequested,this,[this,generation,button,units]{
        if(row!=generation)return;
        auto list=new QListWidget(generation);list->setWindowFlag(Qt::Popup);list->setAttribute(Qt::WA_DeleteOnClose);
        list->addItems(units);list->setCurrentRow(units.indexOf(button->text()));
        auto select=[this,list,generation](QListWidgetItem *item){auto code=item->text();list->close();if(row==generation)commit(code);};
        connect(list,&QListWidget::itemActivated,list,select);connect(list,&QListWidget::itemClicked,list,select);
        list->move(button->mapToGlobal(QPoint(0,button->height())));list->show();list->setFocus();
    });
}
bool BoundInput::commit(QString targetUnit){
    QStringList values;for(auto line:std::as_const(fields))values<<line->text();
    try{
        auto value=object.property(key);
        if(!physical)value=script.call("parse",{kind,values.first()});
        else if(values!=initial)value=script.call("parse",{script.engine.toScriptValue(values),spec});
        if(!targetUnit.isEmpty()){
            if(kind=="pixel_phy")value=script.call("convertPixel",{value,targetUnit});
        }
        if(validate)validate(value);
        if(!value.strictlyEquals(object.property(key)))object.setProperty(key,value);
        if(!targetUnit.isEmpty())unit=targetUnit;
        if(physical)refresh();
        if(committed)committed();
        return true;
    }catch(const std::exception &e){fields.first()->setToolTip(e.what());return false;}
}
void testInputs(){
    testSliders();
    BoundInput field("integer","integer");auto &js=field.engine();
    auto first=js.newObject(),second=js.newObject();first.setProperty("v",12);second.setProperty("v",22);
    field.bind(first,"v");auto old=field.editor();old->setText("31");field.bind(second,"v");
    old->returnPressed();if(second.property("v").toInt()!=22)throw std::runtime_error("Stale input write");
    BoundInput length("length","長度",true);
    auto sample=Script::checked(length.engine().evaluate("({length:{unit:'mm',value:1/3,rational:{kind:'rational',numerator:1,denominator:3}}})"));
    auto original=sample.property("length");
    length.bind(sample,"length");length.show();QApplication::processEvents();
    auto linkFor=[](BoundInput &field){
        auto link=field.editor()->parentWidget()->findChild<QToolButton*>("physicalUnitLink");
        if(!link||!link->font().underline()||field.editor()->hasFrame()||
           !qobject_cast<QFrame*>(link->parentWidget()))throw std::runtime_error("Physical input frame or unit link");
        return link;
    };
    auto units=length.engine().globalObject().property("ChipPhysical").property("layout").call(
        {"length",length.engine().newObject(),QJSValue(QJSValue::NullValue),original}).property("units").toVariant().toStringList();
    for(int i=0;i<units.size();++i){
        auto link=linkFor(length);auto next=units[(units.indexOf(link->text())+1)%units.size()];
        QTest::mouseClick(link,Qt::LeftButton);
        if(linkFor(length)->text()!=next||!sample.property("length").strictlyEquals(original))
            throw std::runtime_error("Unit cycle changed the exact bound length");
    }
    length.editor()->setText("invalid");auto previous=linkFor(length);
    QTest::mouseClick(previous,Qt::LeftButton);
    if(linkFor(length)!=previous||!sample.property("length").strictlyEquals(original))
        throw std::runtime_error("Invalid draft switched the physical unit");
    BoundInput calibration("pixel_phy","scale",true);
    auto &engine=calibration.engine();auto obj=Script::checked(engine.evaluate("({scale:[[960,254],'mm']})"));
    calibration.bind(obj,"scale");
    calibration.show();QApplication::processEvents();
    auto start=linkFor(calibration)->text();
    for(int i=0;i<32;++i){
        QTest::mouseClick(linkFor(calibration),Qt::LeftButton);
        if(linkFor(calibration)->text()==start)break;
    }
    auto roundTrip=obj.property("scale");
    if(roundTrip.property(1).toString()!="mm"||
       roundTrip.property(0).property(0).toNumber()/roundTrip.property(0).property(1).toNumber()!=960./254)
        throw std::runtime_error("Pixel calibration unit cycle changed its ratio");
    if(!calibration.commit("inch"))throw std::runtime_error("Pixel conversion failed");
    auto scale=obj.property("scale");
    if(scale.property(0).property(0).toInt()!=96||scale.property(0).property(1).toInt()!=1||scale.property(1).toString()!="inch")throw std::runtime_error("Pixel ratio changed");
    field.editor()->setText("15");if(!field.commit()||second.property("v").toInt()!=15)throw std::runtime_error("Scalar commit");
}
