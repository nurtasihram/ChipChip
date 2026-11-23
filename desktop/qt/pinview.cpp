#include "sliders.h"
#include <QtTest/QTest>
#include "pane.h"
#include <memory>

class PinCanvas final : public QGraphicsView {
    QPointF press;
protected:
    void mousePressEvent(QMouseEvent *event) override {press=event->position();QGraphicsView::mousePressEvent(event);}
    void mouseReleaseEvent(QMouseEvent *event) override {
        QGraphicsView::mouseReleaseEvent(event);
        if(event->button()!=Qt::LeftButton||(event->position()-press).manhattanLength()>=9)return;
        auto radius=pickRadiusPixels();auto pos=event->position().toPoint();
        double nearest=radius*radius;QString id;
        for(auto item:items(QRectF(event->position()-QPointF(radius,radius),QSizeF(2*radius,2*radius)).toAlignedRect())){
            auto delta=mapFromScene(item->pos())-pos;double distance=QPoint::dotProduct(delta,delta);
            if(distance<nearest){nearest=distance;id=item->data(0).toString();}
        }
        if(!id.isEmpty())select(id,false);
    }
    void wheelEvent(QWheelEvent *e)override{
        double change=std::pow(viewSettings.property("wheelMultiplier").toNumber(),e->angleDelta().y()/120.);
        if(transform().m11()*change>=1&&transform().m11()*change<=1000)scale(change,change);e->accept();
    }
public:
    QJSValue viewSettings;
    QJSValue lengthInUnit;
    double pickRadiusPixels() const {
        auto radius=Script::checked(lengthInUnit.call({"length",viewSettings.property("pickRadius"),"mm"}));
        return std::max(15.,transform().m11()*radius.toNumber());
    }
    std::function<void(QString,bool)> select;
};
class Pins final : public Pane{
    Script script{":/desktop/qt/pinview.js"};
    PinCanvas *canvas=new PinCanvas;
    QGraphicsScene *board=new QGraphicsScene(this);
    QHash<QString,QAbstractGraphicsShapeItem*> shapes;
    QJsonObject source;
    QString path,current;
    BoundInput *query=new BoundInput("string","管腳搜尋");
    QCheckBox *ball,*name,*exact,*ignoreCase,*regex;
    QListWidget *results=new QListWidget;
    QLabel *details=new QLabel;
    QJSValue searchObject;
    void saveDialog(bool choose){
        auto dest=choose||path.isEmpty()?QFileDialog::getSaveFileName(this,"另存 PinView",path,"JSON (*.json)"):path;
        if(!dest.isEmpty())try{save(dest);}catch(const std::exception &e){QMessageBox::warning(this,"PinView",e.what());}
    }
    void select(QString id,bool reveal){
        auto pin=script.call("select",{id,reveal});auto item=shapes.value(id);
        if(!item)return;
        if(auto old=shapes.value(current))old->setPen(Qt::NoPen);
        if(reveal){
            auto group=pin.property("group").toString();
            for(auto shape:std::as_const(shapes))if(shape->data(1).toString()==group)shape->show();
            canvas->centerOn(item);
        }
        QPen pen(Qt::yellow);pen.setCosmetic(true);item->setPen(pen);current=id;
        details->setText(id+"  "+pin.property("names").toVariant().toStringList().join(" / ")+"\n"+pin.property("group").toString());
    }
public:
    explicit Pins(const QString &file):Pane("PinView"){
        setWindowTitle("PinView");resize(1100,740);setCentralWidget(canvas);canvas->setScene(board);
        canvas->setBackgroundBrush(QColor("#101a2b"));canvas->setRenderHint(QPainter::Antialiasing);
        canvas->setDragMode(QGraphicsView::ScrollHandDrag);canvas->setTransformationAnchor(QGraphicsView::AnchorUnderMouse);
        canvas->select=[this](QString id,bool reveal){select(id,reveal);};
        auto dock=new Pane("搜尋與管腳資訊",canvas->viewport());dock->resize(300,560);
        auto pane=new QWidget;dock->setCentralWidget(pane);auto box=new QVBoxLayout(pane);box->setContentsMargins(6,dock->titleHeight()+3,6,6);box->addWidget(query);
        auto flag=[box](QString label,bool on){auto f=new QCheckBox(label);f->setChecked(on);box->addWidget(f);return f;};
        ball=flag("編號",true);name=flag("名稱",true);exact=flag("完全相符",false);ignoreCase=flag("忽略大小寫",true);regex=flag("正則表達式",false);
        box->addWidget(results);box->addWidget(details);details->setWordWrap(true);
        auto addSlider=[pane,box](QString kind,QString label,double min,double max,int divisions){
            auto slider=new BoundSlider(kind,label,min,max,divisions,pane);
            auto caption=new QLabel(label,pane);caption->setBuddy(slider);
            box->addWidget(caption);box->addWidget(slider);return slider;
        };
        auto zoom=addSlider("decimal","每格滾輪縮放倍率",1.01,2.,99);
        auto radius=addSlider("length","管腳點選半徑",0.,2.,200);
        zoom->setObjectName("wheelMultiplier");radius->setObjectName("pickRadius");
        // These settings belong to the canvas and survive opening another pin document.
        auto &engine=radius->engine();
        canvas->viewSettings=engine.newObject();
        canvas->viewSettings.setProperty("wheelMultiplier",1.2);
        auto length=engine.newObject();length.setProperty("value",.34);length.setProperty("unit","mm");
        canvas->viewSettings.setProperty("pickRadius",length);
        canvas->lengthInUnit=engine.globalObject().property("ChipPhysical").property("sliderAmount");
        zoom->bind(canvas->viewSettings,"wheelMultiplier");
        radius->bind(canvas->viewSettings,"pickRadius");
        auto titleAction=[this](QString label){auto b=new QToolButton(this);auto action=new QAction(label,b);b->setDefaultAction(action);b->setToolButtonStyle(Qt::ToolButtonTextOnly);titleButton(b);addAction(action);return action;};
        auto toggle=titleAction("搜尋");toggle->setCheckable(true);toggle->setChecked(true);connect(toggle,&QAction::toggled,dock,&QWidget::setVisible);
        connect(titleAction("關閉"),&QAction::triggered,this,&QWidget::close);
        QTimer::singleShot(0,dock,[dock]{dock->openAt(QPoint(12,38));});
        auto open=titleAction("開啟");open->setShortcut(QKeySequence::Open);
        connect(open,&QAction::triggered,this,[this]{auto p=QFileDialog::getOpenFileName(this,"PinView",{},"JSON (*.json)");if(!p.isEmpty())try{load(p);}catch(const std::exception&e){QMessageBox::warning(this,"PinView",e.what());}});
        auto saveAction=titleAction("保存");saveAction->setShortcut(QKeySequence::Save);
        connect(saveAction,&QAction::triggered,this,[this]{saveDialog(false);});
        auto saveAs=titleAction("另存");saveAs->setShortcut(QKeySequence::SaveAs);connect(saveAs,&QAction::triggered,this,[this]{saveDialog(true);});
        connect(results,&QListWidget::currentItemChanged,this,[this](QListWidgetItem *item){if(item)select(item->data(Qt::UserRole).toString(),true);});
        load(file.isEmpty()?":/examples/PinView_Draft_0_2_E38xx_demo.json":file);
        if(file.isEmpty())path.clear();
    }
    void load(QString file){
        auto raw=readFile(file);if(raw.startsWith("\xef\xbb\xbf"))raw.remove(0,3);auto doc=script.parse(raw);
        auto factory=script.engine.globalObject().property("openPinView");
        auto next=Script::checked(factory.call({doc}));
        script.model=next;source=QJsonDocument::fromJson(raw).object();path=file;
        results->clear();details->clear();board->clear();shapes.clear();current.clear();
        auto pins=script.call("geometry").toVariant().toList();
        for(auto &entry:pins){
            auto p=entry.toMap();auto w=p["w"].toDouble(),h=p["h"].toDouble();QRectF rect(-w/2,-h/2,w,h);
            QBrush brush(QColor(p["color"].toString()));QAbstractGraphicsShapeItem *item;
            if(p["circle"].toBool())item=board->addEllipse(rect,Qt::NoPen,brush);else item=board->addRect(rect,Qt::NoPen,brush);
            auto id=p["id"].toString();shapes.insert(id,item);item->setPos(p["x"].toDouble(),-p["y"].toDouble());
            item->setRotation(-p["rotation"].toDouble());item->setData(0,id);item->setData(1,p["group"]);item->setVisible(!p["hidden"].toBool());
        }
        auto bounds=board->itemsBoundingRect();board->setSceneRect(bounds.adjusted(-1,-1,1,1));
        QTimer::singleShot(0,canvas,[this]{canvas->fitInView(board->sceneRect(),Qt::KeepAspectRatio);});
        auto selected=script.call("current");if(selected.isObject())select(selected.property("id").toString(),false);
        searchObject=query->engine().newObject();searchObject.setProperty("text","");query->bind(searchObject,"text");
        connect(query->editor(),&QLineEdit::returnPressed,this,[this]{
            results->clear();
            try{auto hits=script.call("search",{searchObject.property("text").toString(),ball->isChecked(),name->isChecked(),exact->isChecked(),ignoreCase->isChecked(),regex->isChecked()}).toVariant().toList();
                for(auto &entry:hits){auto pair=entry.toStringList();auto item=new QListWidgetItem(pair.join("  "),results);item->setData(Qt::UserRole,pair.first());}
            }catch(const std::exception &e){details->setText(e.what());}
            if(results->count())results->setCurrentRow(0);
        });
    }
    void save(QString dest){
        auto state=script.call("selectionState");auto doc=source;auto view=doc["view_state"].toObject(),groups=view["groups"].toObject();
        QJsonObject modes;for(auto entry:state.property("modes").toVariant().toList()){auto pair=entry.toList();modes.insert(pair[0].toString(),QJsonValue::fromVariant(pair[1]));}
        groups["modes"]=modes;view["groups"]=groups;view["selectedBall"]=QJsonValue::fromVariant(state.property("selectedBall").toVariant());doc["view_state"]=view;
        QSaveFile target(dest);auto bytes=QJsonDocument(doc).toJson();
        if(!target.open(QIODevice::WriteOnly)||target.write(bytes)!=bytes.size()||!target.commit())throw std::runtime_error(target.errorString().toStdString());
        source=doc;path=dest;
    }
    void verify(){
        show();QApplication::processEvents();
        auto exercise=[this](QString field,double initial,double increment,auto read,auto checkCanvas){
            auto widget=findChild<QWidget*>(field);
            auto rail=widget?widget->findChild<QSlider*>():nullptr;
            if(!rail||!rail->isVisible())throw std::runtime_error("Missing PinView slider");
            auto check=[&](double expected){
                if(std::abs(read()-expected)>1e-9)throw std::runtime_error("PinView bound field did not change");
                checkCanvas(expected);
            };
            check(initial);
            rail->window()->activateWindow();QApplication::processEvents();rail->clearFocus();
            QPoint pos=rail->rect().center();QTest::mouseMove(rail,pos);
            QWheelEvent wheel(pos,rail->mapToGlobal(pos),{},QPoint(0,120),Qt::NoButton,Qt::NoModifier,Qt::NoScrollPhase,false);
            QApplication::sendEvent(rail,&wheel);
            if(rail->hasFocus())throw std::runtime_error("Wheel stole slider focus");
            check(initial+increment);
            rail->setFocus();if(!rail->hasFocus())throw std::runtime_error("Panel slider could not take focus");
            QTest::keyClick(rail,Qt::Key_Right);check(initial+2*increment);
            QTest::keyClick(rail,Qt::Key_Left);check(initial+increment);
        };
        exercise("wheelMultiplier",1.2,.01,[this]{return canvas->viewSettings.property("wheelMultiplier").toNumber();},
            [this](double expected){
                canvas->setTransform(QTransform::fromScale(100,100));
                QWheelEvent event(QPointF(50,50),canvas->viewport()->mapToGlobal(QPoint(50,50)),{},QPoint(0,120),Qt::NoButton,Qt::NoModifier,Qt::NoScrollPhase,false);
                QApplication::sendEvent(canvas->viewport(),&event);
                if(std::abs(canvas->transform().m11()-100*expected)>1e-8)throw std::runtime_error("Canvas zoom did not follow slider");
            });
        // Probe just outside the default physical radius, away from neighboring pins.
        QAbstractGraphicsShapeItem *edgePin=nullptr;
        for(auto item:std::as_const(shapes))
            if(item->isVisible()&&(!edgePin||item->x()>edgePin->x()))edgePin=item;
        if(!edgePin)throw std::runtime_error("Missing visible pin for hit test");
        canvas->setTransform(QTransform::fromScale(200,200));
        canvas->centerOn(edgePin);
        exercise("pickRadius",.34,.01,[this]{return canvas->viewSettings.property("pickRadius").property("value").toNumber();},
            [this,edgePin](double expected){
                current.clear();
                const QPoint probe=canvas->mapFromScene(edgePin->pos())+QPoint(69,0);
                QTest::mouseClick(canvas->viewport(),Qt::LeftButton,Qt::NoModifier,probe);
                const bool shouldHit=expected*200>69;
                if((current==edgePin->data(0).toString())!=shouldHit)throw std::runtime_error("Canvas pin selection did not follow physical radius");
            });
        if(shapes.isEmpty())throw std::runtime_error("Empty PinView");
        auto id=shapes.constBegin().key();exact->setChecked(true);name->setChecked(false);
        query->editor()->setText(id);query->editor()->returnPressed();
        if(results->count()!=1||current!=id)throw std::runtime_error("Pin search or selection failed");
        QTemporaryDir temp;auto file=temp.filePath("pins.json");save(file);load(file);
        if(current!=id)throw std::runtime_error("PinView round trip failed");
    }
};
QWidget *pinWindow(const QString &file){return new Pins(file);}
void testPins(){Pins pins({});pins.verify();}
