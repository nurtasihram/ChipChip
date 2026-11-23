#include "sliders.h"

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
    fields.clear();row=new QWidget(this);auto layout=new QHBoxLayout(row);layout->setContentsMargins(0,0,0,0);box.addWidget(row);
    auto generation=row;
    auto mode=spec.property("mode").toString();
    for(int i=0;i<initial.size();++i){
        auto line=new QLineEdit(initial[i],row);fields<<line;layout->addWidget(line);
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
    auto button=new QToolButton(row);button->setText(current.toString());layout->addWidget(button);
    connect(button,&QToolButton::clicked,this,[this,generation,button,units]{
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
            unit=targetUnit;
        }
        if(validate)validate(value);
        object.setProperty(key,value);if(physical)refresh();if(committed)committed();return true;
    }catch(const std::exception &e){fields.first()->setToolTip(e.what());return false;}
}
void testInputs(){
    testSliders();
    BoundInput field("integer","integer");auto &js=field.engine();
    auto first=js.newObject(),second=js.newObject();first.setProperty("v",12);second.setProperty("v",22);
    field.bind(first,"v");auto old=field.editor();old->setText("31");field.bind(second,"v");
    old->returnPressed();if(second.property("v").toInt()!=22)throw std::runtime_error("Stale input write");
    BoundInput calibration("pixel_phy","scale",true);
    auto &engine=calibration.engine();auto obj=Script::checked(engine.evaluate("({scale:[[960,254],'mm']})"));
    calibration.bind(obj,"scale");
    if(!calibration.commit("inch"))throw std::runtime_error("Pixel conversion failed");
    auto scale=obj.property("scale");
    if(scale.property(0).property(0).toInt()!=96||scale.property(0).property(1).toInt()!=1||scale.property(1).toString()!="inch")throw std::runtime_error("Pixel ratio changed");
    field.editor()->setText("15");if(!field.commit()||second.property("v").toInt()!=15)throw std::runtime_error("Scalar commit");
}
