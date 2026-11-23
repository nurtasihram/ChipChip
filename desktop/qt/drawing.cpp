#include "pane.h"
#include <optional>
#include <QtTest/QTest>

class Canvas final : public QGraphicsView {
    Script session{drawingBundle};
    QGraphicsScene board;
    QGraphicsPolygonItem *ghost=nullptr;
    QHash<QString,QGraphicsItem*> objects;
    std::optional<QPointF> press;
    bool first=false;
    QJSValue point(QMouseEvent *event) {
        auto p=mapToScene(event->position().toPoint());
        return session.engine.toScriptValue(QVariantList{p.x(),-p.y()});
    }
    QGraphicsPolygonItem *polygon(QJSValue shape,bool preview) {
        auto p=shape.property("point");
        QPointF origin(p.property(0).toNumber(),-p.property(1).toNumber());
        auto w=shape.property("width").toNumber(), h=shape.property("height").toNumber();
        QTransform rotation;
        rotation.rotate(-shape.property("rotation").toNumber());
        QPolygonF outline;
        for(auto offset:QPolygonF{{0,0},{w,0},{w,h},{0,h}}) outline<<origin+rotation.map(offset);
        return board.addPolygon(outline,QPen(QColor(preview?"#ffd166":"#69b8ff"),2,preview?Qt::DashLine:Qt::SolidLine));
    }
    void preview(QJSValue point) {
        delete ghost; ghost=nullptr;
        auto shape=session.call("preview",{point});
        if(shape.isObject()) ghost=polygon(shape,true);
    }
    void apply(QJSValue change) {
        if(!change.isObject()) return;
        if(change.hasProperty("remove")) delete objects.take(change.property("remove").toString());
        else objects.insert(change.property("add").toString(),polygon(change.property("geometry"),false));
    }
public:
    QString method="diagonal";
    Canvas() {
        session.model=Script::checked(session.engine.evaluate("nativeRectangleSession()"));
        setScene(&board); board.setSceneRect(-10000,-10000,20000,20000);
        setMouseTracking(true); setRenderHint(QPainter::Antialiasing);
        setBackgroundBrush(QColor("#101a2b"));setFrameShape(QFrame::NoFrame);
        setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
        centerOn(0,0);
    }
    Script &model(){return session;}
    void command(const QString &name){press.reset();delete ghost;ghost=nullptr;apply(session.call(name));}
protected:
    void mousePressEvent(QMouseEvent *e) override {
        if(dragMode()==ScrollHandDrag||e->button()!=Qt::LeftButton)return QGraphicsView::mousePressEvent(e);
        press=e->position();first=!session.call("active").toBool();
        if(first)session.call("begin",{method,point(e),0});
        preview(point(e));e->accept();
    }
    void mouseMoveEvent(QMouseEvent *e) override {
        if(session.call("active").toBool()) preview(point(e));else QGraphicsView::mouseMoveEvent(e);
    }
    void mouseReleaseEvent(QMouseEvent *e) override {
        if(!press||e->button()!=Qt::LeftButton)return QGraphicsView::mouseReleaseEvent(e);
        auto delta=e->position()-*press;press.reset();
        auto change=(!first||QPointF::dotProduct(delta,delta)>16)?session.call("place",{point(e)}):QJSValue();
        if(change.isObject()){delete ghost;ghost=nullptr;apply(change);}else preview(point(e));
        e->accept();
    }
    void wheelEvent(QWheelEvent *e) override {e->accept();}
};

class ChoiceRow final : public QWidget {
    QHBoxLayout *box=new QHBoxLayout(this);
    QList<QToolButton*> buttons;
    QString detail="auto_collapse";
    bool open=false,compact=false;
    QPoint start;
    bool reveal(QToolButton *button){
        if(!compact||open||!button->isChecked())return false;
        open=true;button->setDown(false);sync();return true;
    }
    void sync() {
        int required=box->spacing()*std::max(0,int(buttons.size())-1);
        for(auto b:buttons)required+=b->sizeHint().width();
        compact=detail=="collapse"||(detail=="auto_collapse"&&width()<required);
        if(!compact)open=false;
        for(auto b:buttons)b->setVisible(!compact||open||b->isChecked());
    }
protected:
    void resizeEvent(QResizeEvent *e) override {QWidget::resizeEvent(e);sync();}
    bool eventFilter(QObject *object,QEvent *e) override {
        auto b=qobject_cast<QToolButton*>(object);
        if(!b)return false;
        int step=0;
        if(e->type()==QEvent::Wheel)step=-qBound(-1,static_cast<QWheelEvent*>(e)->angleDelta().y(),1);
        if(e->type()==QEvent::KeyPress){
            int key=static_cast<QKeyEvent*>(e)->key();
            if(key==Qt::Key_Escape&&open){open=false;sync();return true;}
            if((key==Qt::Key_Space||key==Qt::Key_Return)&&reveal(b))return true;
            step=key==Qt::Key_Up?-1:key==Qt::Key_Down?1:0;
        }
        if(step){
            auto i=std::find_if(buttons.begin(),buttons.end(),[](auto x){return x->isChecked();})-buttons.begin();
            auto next=buttons[(i+step+buttons.size())%buttons.size()];
            next->defaultAction()->trigger();open=false;sync();
            if(e->type()==QEvent::KeyPress)next->setFocus();
            return true;
        }
        if(e->type()==QEvent::MouseButtonPress)start=static_cast<QMouseEvent*>(e)->globalPosition().toPoint();
        if(e->type()==QEvent::MouseButtonRelease){
            auto end=static_cast<QMouseEvent*>(e)->globalPosition().toPoint();
            if((end-start).manhattanLength()>=QApplication::startDragDistance() && property("resortable").toBool()){
                for(auto target:std::as_const(buttons))if(target!=b&&target->isVisible()&&target->rect().contains(target->mapFromGlobal(end))){
                    auto index=buttons.indexOf(target);buttons.move(buttons.indexOf(b),index);box->removeWidget(b);box->insertWidget(index,b);break;
                }
                b->setDown(false);return true;
            }
            if(reveal(b))return true;
        }

        return false;
    }
    bool event(QEvent *e) override {
        if(e->type()==QEvent::DynamicPropertyChange&&static_cast<QDynamicPropertyChangeEvent*>(e)->propertyName()=="detail_type"){
            detail=property("detail_type").toString();open=false;sync();
        }
        return QWidget::event(e);
    }
public:
    ChoiceRow(){box->setContentsMargins(0,0,0,0);setProperty("detail_type",detail);setProperty("resortable",true);}
    QSize minimumSizeHint()const override{return buttons.isEmpty()?QSize():buttons.first()->sizeHint();}
    void add(QToolButton *b){buttons<<b;box->addWidget(b);b->installEventFilter(this);
        connect(b->defaultAction(),&QAction::triggered,this,[this]{open=false;sync();});}
};

class HelpButton final : public QToolButton {
    Script &session;
    QString lang;
    QJSValue visual;
    QTimer timer;
    QElapsedTimer clock;
    QTimer hold;
    QString key,device;
    QPointF position;
    bool dragging=false;
    void pointerEvent(QString phase,QPointF pos){
        position=pos;
        auto result=session.call("buttonGesture",{key,phase,device,pos.x(),pos.y()}).toString();
        if(phase=="down"){dragging=false;setDown(true);hold.start();}
        if(result=="secondary"){clock.restart();hint();timer.start();setDown(false);}
        if(result=="drag"){hold.stop();dragging=true;setDown(false);}
        if(phase=="up"||phase=="cancel"){
            hold.stop();setDown(false);
            // Route activation and the final drop through the same choice-row event filter as a mouse.
            if((result=="primary"&&rect().contains(pos.toPoint()))||(dragging&&phase=="up")){
                auto start=dragging?pointerStart:pos;
                QMouseEvent down(QEvent::MouseButtonPress,start,mapToGlobal(start.toPoint()),Qt::LeftButton,Qt::LeftButton,Qt::NoModifier);
                QMouseEvent up(QEvent::MouseButtonRelease,pos,mapToGlobal(pos.toPoint()),Qt::LeftButton,Qt::NoButton,Qt::NoModifier);
                QApplication::sendEvent(this,&down);QApplication::sendEvent(this,&up);
            }
            dragging=false;
        }
    }
    QPointF pointerStart;
    void hint(){
        if(!isVisible())return;
        auto svg=visual.property("kind").toString()=="animation"
            ?session.call("helpFrame",{visual.property("id"),lang,(clock.elapsed()%4200)/4200.0}).toString()
            :visual.property("svg").toString();
        auto text=defaultAction()->toolTip().toHtmlEscaped();
        QToolTip::showText(mapToGlobal(QPoint(0,height())),text+"<br><img width='180' src='data:image/svg+xml;base64,"+svg.toUtf8().toBase64()+"'>",this);
    }
    bool event(QEvent *e) override {
        auto type=e->type();
        if(type==QEvent::TouchBegin||type==QEvent::TouchUpdate||type==QEvent::TouchEnd||type==QEvent::TouchCancel||
           type==QEvent::TabletPress||type==QEvent::TabletMove||type==QEvent::TabletRelease){
            auto p=static_cast<QPointerEvent*>(e);auto pos=p->pointCount()?p->point(0).position():position;
            bool tablet=type==QEvent::TabletPress||type==QEvent::TabletMove||type==QEvent::TabletRelease;
            if(type==QEvent::TabletMove&&device.isEmpty())return QToolButton::event(e);
            if(type==QEvent::TouchBegin||type==QEvent::TabletPress){device=tablet?"pen":"touch";pointerStart=pos;pointerEvent("down",pos);}
            else if(type==QEvent::TouchEnd||type==QEvent::TabletRelease||type==QEvent::TouchCancel){
                pointerEvent(type==QEvent::TouchCancel?"cancel":"up",pos);device.clear();
            }else pointerEvent("move",pos);
            e->accept();return true;
        }
        if(type==QEvent::ContextMenu){clock.restart();hint();timer.start();return true;}
        if(e->type()==QEvent::ToolTip||e->type()==QEvent::FocusIn){clock.restart();hint();timer.start();if(e->type()==QEvent::ToolTip)return true;}
        if(e->type()==QEvent::Leave||e->type()==QEvent::Hide||e->type()==QEvent::FocusOut||e->type()==QEvent::MouseButtonPress){timer.stop();QToolTip::hideText();}
        return QToolButton::event(e);
    }
public:
    HelpButton(Script &model,QString language,QJSValue def,QWidget *parent):QToolButton(parent),session(model),lang(language),visual(def.property("visual")){
        QPixmap image(24,24);image.fill(Qt::transparent);QSvgRenderer renderer(def.property("svg").toString().toUtf8());
        {QPainter painter(&image);renderer.render(&painter);}
        auto title=def.property("alt").toString();auto action=new QAction(renderer.isValid()?QIcon(image):QIcon(),title,this);
        auto tips=def.property("hint").toVariant();
        action->setToolTip(tips.typeId()==QMetaType::QVariantList?tips.toStringList().join(" → "):tips.toString());
        setDefaultAction(action);setAccessibleName(title);if(action->icon().isNull())setToolButtonStyle(Qt::ToolButtonTextOnly);
        key=def.property("action").toString();setAttribute(Qt::WA_AcceptTouchEvents);setAttribute(Qt::WA_TabletTracking);
        hold.setSingleShot(true);hold.setInterval(session.call("holdMs").toInt());connect(&hold,&QTimer::timeout,this,[this]{pointerEvent("hold",position);});
        timer.setInterval(80);connect(&timer,&QTimer::timeout,this,[this]{hint();});
    }
};

QWidget *drawingWindow(){
    auto window=new Pane("ChipDraw");window->setMinimumSize(350,220);window->setWindowTitle("ChipDraw");window->resize(960,680);
    auto canvas=new Canvas;window->setCentralWidget(canvas);
    auto &model=canvas->model();auto lang=QLocale().bcp47Name();
    auto dock=new Pane(model.call("text",{"rect.title",lang}).toString(),canvas->viewport());dock->resize(220,88);
    auto pane=new QWidget(dock);auto layout=new QVBoxLayout(pane);dock->setCentralWidget(pane);

    auto button=[&](QString key,QWidget *parent){return new HelpButton(model,lang,model.call("button",{key,lang}),parent);};
    auto close=button("pane.close",window);window->titleButton(close,true);QObject::connect(close,&QToolButton::clicked,window,&QWidget::close);
    
    auto pan=button("canvas.pan",pane);pan->defaultAction()->setCheckable(true);dock->titleButton(pan);
    QObject::connect(pan,&QToolButton::clicked,canvas,[canvas](bool on){canvas->command("cancel");canvas->setDragMode(on?QGraphicsView::ScrollHandDrag:QGraphicsView::NoDrag);});
    auto hide=button("panel.close",pane);dock->titleButton(hide);layout->setContentsMargins(6,dock->titleHeight()+2,6,4);QObject::connect(hide,&QToolButton::clicked,dock,&QWidget::hide);
    auto row=new ChoiceRow;layout->addWidget(row);auto group=new QActionGroup(row);
    auto defs=model.call("methods",{lang});
    for(int i=0;i<defs.property("length").toInt();++i){
        auto def=defs.property(i);auto key=def.property("action").toString();auto b=new HelpButton(model,lang,def,row);
        auto action=b->defaultAction();group->addAction(action);action->setCheckable(true);action->setChecked(key==canvas->method);
        row->add(b);QObject::connect(action,&QAction::triggered,canvas,[canvas,pan,key]{pan->setChecked(false);canvas->setDragMode(QGraphicsView::NoDrag);canvas->command("cancel");canvas->method=key;});
    }
    canvas->setContextMenuPolicy(Qt::CustomContextMenu);
    QObject::connect(canvas,&QWidget::customContextMenuRequested,dock,[dock](QPoint p){dock->openAt(p);});
    for(auto pair:{std::pair{QKeySequence(Qt::Key_Escape),"cancel"},std::pair{QKeySequence(Qt::Key_Return),"confirm"},std::pair{QKeySequence(QKeySequence::Undo),"undo"},std::pair{QKeySequence(QKeySequence::Redo),"redo"}}){
        auto shortcut=new QShortcut(pair.first,window);QObject::connect(shortcut,&QShortcut::activated,canvas,[canvas,name=pair.second]{canvas->command(name);});
    }
    return window;
}

void testDrawing(){
    std::unique_ptr<QWidget> window(drawingWindow());
    auto canvas=static_cast<Canvas*>(static_cast<QMainWindow*>(window.get())->centralWidget());
    window->show();QApplication::processEvents();
    if(!window->windowFlags().testFlag(Qt::FramelessWindowHint)||canvas->geometry().top()>1)throw std::runtime_error("Canvas frame");
    auto &s=canvas->model();
    auto viewport=canvas->viewport();auto start=canvas->mapFromScene(QPointF(0,0));auto end=canvas->mapFromScene(QPointF(40,-30));
    QTest::mouseClick(viewport,Qt::LeftButton,Qt::NoModifier,start);
    QTest::mouseMove(viewport,end);
    if(!s.call("active").toBool())throw std::runtime_error("Missing rectangle draft");
    QTest::mouseClick(viewport,Qt::LeftButton,Qt::NoModifier,end);
    if(canvas->scene()->items().size()!=1)throw std::runtime_error("Canvas commit failed");
    canvas->command("undo");if(!canvas->scene()->items().isEmpty())throw std::runtime_error("Canvas undo failed");
    auto p=[&](int x,int y){return s.engine.toScriptValue(QVariantList{x,y});};
    s.call("begin",{"diagonal",p(1,2),0});s.call("place",{p(12,23)});
    auto items=[&]{return s.call("document").property("items");};
    if(items().property("length").toInt()!=1)throw std::runtime_error("Rectangle placement failed");
    auto id=items().property(0).property("id").toString();s.call("undo");
    if(items().property("length").toInt())throw std::runtime_error("Undo failed");
    s.call("redo");if(items().property(0).property("id").toString()!=id)throw std::runtime_error("Redo failed");
}
