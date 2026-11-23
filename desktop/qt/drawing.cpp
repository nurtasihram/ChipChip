#include "button-hint.h"
#include "pane.h"
#include <optional>
#include <QtTest/QTest>

class Canvas final : public QGraphicsView {
    Script session{drawingBundle};
    QGraphicsScene board;
    QGraphicsPolygonItem *ghost=nullptr;
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
    QPainterPath guides,markers;
    static QPointF scenePoint(QJSValue p){return {p.property("x").toNumber(),p.property("y").toNumber()};}
    void clearPreview(){
        delete ghost;ghost=nullptr;guides=QPainterPath();markers=QPainterPath();viewport()->update();
    }
    void preview(QJSValue point) {
        clearPreview();
        auto frame=session.call("construction",{point});if(!frame.isObject())return;
        auto shape=frame.property("outline");
        if(shape.isObject())ghost=polygon(shape,true);
        auto lines=frame.property("lines"),anchors=frame.property("anchors");
        for(int i=0;i<lines.property("length").toInt();++i){
            auto pair=lines.property(i);guides.moveTo(scenePoint(pair.property(0)));guides.lineTo(scenePoint(pair.property(1)));
        }
        auto circle=frame.property("constraint");
        if(circle.isObject()){
            QPointF center(circle.property("cx").toNumber(),circle.property("cy").toNumber());
            double radius=circle.property("r").toNumber();guides.addEllipse(center,radius,radius);
        }
        const double dot=3./transform().m11();
        for(int i=0;i<anchors.property("length").toInt();++i)markers.addEllipse(scenePoint(anchors.property(i)),dot,dot);
        auto candidate=frame.property("candidate");
        if(candidate.isObject())guides.addEllipse(scenePoint(candidate),dot,dot);
    }
    void drawForeground(QPainter *painter,const QRectF &) override {
        painter->save();
        QPen pen(QColor("#e7a45d"),0,Qt::DashLine);painter->setPen(pen);painter->setBrush(Qt::NoBrush);painter->drawPath(guides);
        painter->setPen(Qt::NoPen);painter->setBrush(QColor("#ffd166"));painter->drawPath(markers);painter->restore();
    }
    void apply(QJSValue change) {
        if(!change.isObject()) return;
        polygon(change.property("geometry"),false);
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
    void command(const QString &name){press.reset();clearPreview();apply(session.call(name));}
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
        if(change.isObject()){clearPreview();apply(change);}else preview(point(e));
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
    ChoiceRow(){box->setSpacing(4);box->setContentsMargins(0,0,0,0);setProperty("detail_type",detail);setProperty("resortable",true);}
    QSize minimumSizeHint()const override{return buttons.isEmpty()?QSize():buttons.first()->sizeHint();}
    void add(QToolButton *b){buttons<<b;box->addWidget(b);b->installEventFilter(this);
        connect(b->defaultAction(),&QAction::triggered,this,[this]{open=false;sync();});}
};

class ButtonSvgIcon final : public QIconEngine {
    QByteArray svg;
public:
    explicit ButtonSvgIcon(QByteArray source):svg(std::move(source)){}
    QIconEngine *clone() const override {return new ButtonSvgIcon(svg);}
    void paint(QPainter *p,const QRect &rect,QIcon::Mode,QIcon::State) override {
        QSvgRenderer renderer(svg);
        p->save();p->setRenderHint(QPainter::Antialiasing);renderer.render(p,rect);p->restore();
    }
    QPixmap scaledPixmap(const QSize &size,QIcon::Mode mode,QIcon::State state,qreal scale) override {
#if QT_VERSION >= QT_VERSION_CHECK(6, 8, 0)
        const QSize pixels=size*scale;
#else
        const QSize pixels=size;
#endif
        QPixmap result=pixmap(pixels,mode,state);
        result.setDevicePixelRatio(scale);
        return result;
    }
    QPixmap pixmap(const QSize &size,QIcon::Mode mode,QIcon::State state) override {
        QPixmap result(size);result.fill(Qt::transparent);
        QPainter painter(&result);paint(&painter,QRect(QPoint(),size),mode,state);return result;
    }
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
    ButtonHint *popup=nullptr;
    inline static QPointer<HelpButton> hintOwner;
    void dismiss(){timer.stop();if(popup)popup->hide();if(hintOwner==this)hintOwner.clear();}
    void hint(){
        if(!isVisible())return;
        auto svg=visual.property("kind").toString()=="animation"
            ?session.call("helpFrame",{visual.property("id"),lang,(clock.elapsed()%4200)/4200.0}).toString()
            :visual.property("svg").toString();
        if(hintOwner && hintOwner!=this)hintOwner->dismiss();
        hintOwner=this;
        if(!popup)popup=new ButtonHint(this);
        popup->display(this,defaultAction()->toolTip(),svg);
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
        if(type==QEvent::ToolTip)return true;
        if(type==QEvent::Enter||type==QEvent::FocusIn){clock.restart();hint();timer.start();}
        if(type==QEvent::KeyPress && static_cast<QKeyEvent*>(e)->key()==Qt::Key_Escape)dismiss();
        if(e->type()==QEvent::Leave||e->type()==QEvent::Hide||e->type()==QEvent::FocusOut||e->type()==QEvent::MouseButtonPress){dismiss();}
        return QToolButton::event(e);
    }
public:
    HelpButton(Script &model,QString language,QJSValue def,QWidget *parent):QToolButton(parent),session(model),lang(language),visual(def.property("visual")){
        auto svg=def.property("svg").toString().replace("currentColor","#d9e9fb").toUtf8();
        auto title=def.property("alt").toString();
        auto action=new QAction(svg.isEmpty()?QIcon():QIcon(new ButtonSvgIcon(svg)),title,this);
        if(!svg.isEmpty()){setFixedSize(36,36);setIconSize(QSize(22,22));}
        auto tips=def.property("hint").toVariant();
        action->setToolTip(tips.typeId()==QMetaType::QVariantList?tips.toStringList().join(" → "):tips.toString());
        setDefaultAction(action);setAccessibleName(title);if(action->icon().isNull())setToolButtonStyle(Qt::ToolButtonTextOnly);
        key=def.property("action").toString();setAttribute(Qt::WA_AcceptTouchEvents);setAttribute(Qt::WA_TabletTracking);
        hold.setSingleShot(true);hold.setInterval(session.call("holdMs").toInt());connect(&hold,&QTimer::timeout,this,[this]{pointerEvent("hold",position);});
        timer.setInterval(33);connect(&timer,&QTimer::timeout,this,[this]{hint();});
    }
};

QWidget *drawingWindow(){
    auto window=new Pane("ChipDraw");window->setMinimumSize(350,220);window->setWindowTitle("ChipDraw");window->resize(960,680);
    auto canvas=new Canvas;window->setCentralWidget(canvas);
    auto &model=canvas->model();auto lang=QLocale().bcp47Name();
    auto dock=new Pane(model.call("text",{"rect.title",lang}).toString(),canvas->viewport());dock->resize(220,88);
    auto pane=new QWidget(dock);auto layout=new QVBoxLayout(pane);dock->setCentralWidget(pane);

    auto button=[&](QString key,QWidget *parent){return new HelpButton(model,lang,model.call("button",{key,lang}),parent);};
    auto close=button("pane.close",dock);dock->titleButton(close,true);QObject::connect(close,&QToolButton::clicked,window,&QWidget::close);
    
    auto tools=window->titleTab();
    tools->setToolTip(model.call("text",{"rect.title",lang}).toString());
    QObject::connect(tools,&QToolButton::clicked,dock,[dock,tools,canvas]{dock->openAt(canvas->viewport()->mapFromGlobal(tools->mapToGlobal(QPoint(0,tools->height()+5))));});
    auto pan=button("canvas.pan",pane);pan->defaultAction()->setCheckable(true);dock->titleButton(pan);
    QObject::connect(pan,&QToolButton::clicked,canvas,[canvas](bool on){canvas->command("cancel");canvas->setDragMode(on?QGraphicsView::ScrollHandDrag:QGraphicsView::NoDrag);});
    auto hide=button("panel.close",pane);dock->titleButton(hide);layout->setContentsMargins(6,2,6,4);QObject::connect(hide,&QToolButton::clicked,dock,&QWidget::hide);
    auto row=new ChoiceRow;layout->addWidget(row);auto group=new QActionGroup(row);
    auto defs=model.call("methods",{lang});
    for(int i=0;i<defs.property("length").toInt();++i){
        auto def=defs.property(i);auto key=def.property("action").toString();auto b=new HelpButton(model,lang,def,row);
        auto action=b->defaultAction();group->addAction(action);action->setCheckable(true);action->setChecked(key==canvas->method);
        row->add(b);QObject::connect(action,&QAction::triggered,canvas,[canvas,pan,key]{pan->setChecked(false);canvas->setDragMode(QGraphicsView::NoDrag);canvas->command("cancel");canvas->method=key;});
    }
    canvas->setContextMenuPolicy(Qt::CustomContextMenu);
    QObject::connect(canvas,&QWidget::customContextMenuRequested,dock,[dock](QPoint p){dock->openAt(p);});
    for(auto pair:{std::pair{QKeySequence(Qt::Key_Escape),"cancel"},std::pair{QKeySequence(Qt::Key_Return),"confirm"}}){
        auto shortcut=new QShortcut(pair.first,window);QObject::connect(shortcut,&QShortcut::activated,canvas,[canvas,name=pair.second]{canvas->command(name);});
    }
    return window;
}

void testDrawing(){
    std::unique_ptr<QWidget> window(drawingWindow());
    auto canvas=static_cast<Canvas*>(static_cast<QMainWindow*>(window.get())->centralWidget());
    window->show();QApplication::processEvents();
    if(!window->windowFlags().testFlag(Qt::FramelessWindowHint)||canvas->geometry().top()>=window->findChild<QFrame*>("paneTitle")->height())throw std::runtime_error("Canvas frame");
    const auto image=window->grab().toImage().convertToFormat(QImage::Format_ARGB32);
    bool antialiased=false;
    for(int y=0;y<qCeil(6*image.devicePixelRatio());++y)
        for(int x=0;x<qCeil(6*image.devicePixelRatio());++x){
            int alpha=image.pixelColor(x,y).alpha();if(alpha>0&&alpha<255)antialiased=true;
        }
    if(window->testAttribute(Qt::WA_TranslucentBackground)&&!antialiased)throw std::runtime_error("Missing translucent rounded corner");
    auto &s=canvas->model();
    auto viewport=canvas->viewport();auto start=canvas->mapFromScene(QPointF(0,0));auto end=canvas->mapFromScene(QPointF(40,-30));
    QTest::mouseClick(viewport,Qt::LeftButton,Qt::NoModifier,start);
    QTest::mouseMove(viewport,end);
    if(!s.call("active").toBool())throw std::runtime_error("Missing rectangle draft");
    QTest::mouseClick(viewport,Qt::LeftButton,Qt::NoModifier,end);
    if(canvas->scene()->items().size()!=1)throw std::runtime_error("Canvas commit failed");
    int committed=1;
    const QString lang=QLocale().bcp47Name();
    auto toolsTitle=s.call("text",{"rect.title",lang}).toString();
    QToolButton *launcher=nullptr;
    for(auto tool:window->findChildren<QToolButton*>())if(tool->text()=="ChipDraw" && tool->toolTip()==toolsTitle)launcher=tool;
    if(!launcher||!launcher->isVisible())throw std::runtime_error("Missing rectangle tools launcher");
    launcher->click();QApplication::processEvents();
    for(auto method:{"diagonal","edge","right-triangle","edge-midpoint"}){
        auto def=s.call("button",{QString("rect.")+method,lang});
        QToolButton *choice=nullptr;
        for(auto tool:window->findChildren<QToolButton*>())if(tool->accessibleName()==def.property("alt").toString())choice=tool;
        if(!choice)throw std::runtime_error("Missing rectangle method");
        if(choice->size()!=QSize(36,36)||choice->iconSize()!=QSize(22,22))throw std::runtime_error("Rectangle button dimensions");
        const auto samples=qEnvironmentVariable("CHIPDRAW_QT_DPI_SAMPLES");
        if(!samples.isEmpty() && QString(method)=="diagonal"){
            QDir directory(samples);
            if(!launcher->grab().save(directory.filePath("qt-title.png")) ||
               !choice->grab().save(directory.filePath("qt-rect.png")) ||
               !choice->icon().pixmap(choice->iconSize(),choice->devicePixelRatioF()).save(directory.filePath("qt-svg.png")))
                throw std::runtime_error("Cannot save DPI samples");
            qInfo()<<"DPR"<<choice->devicePixelRatioF()<<"title"<<launcher->size()<<launcher->font().family()
                   <<"button"<<choice->size()<<"icon"<<choice->iconSize();
        }
        choice->click();if(canvas->method!=method)throw std::runtime_error("Rectangle tool selection failed");
        auto click=[&](QPointF scene){QTest::mouseClick(viewport,Qt::LeftButton,Qt::NoModifier,canvas->mapFromScene(scene));};
        click({0,0});QTest::mouseMove(viewport,canvas->mapFromScene(QPointF(30,15)));
        auto image=viewport->grab().toImage();auto anchor=canvas->mapFromScene(QPointF(0,0))*image.devicePixelRatio();
        if(image.pixelColor(anchor)!=QColor("#ffd166"))throw std::runtime_error("Missing visible first rectangle anchor");
        click({40,30});
        if(QString(method)=="edge"||QString(method)=="right-triangle")click({0,35});
        if(s.call("active").toBool()||canvas->scene()->items().size()!=++committed)throw std::runtime_error("Pointer rectangle construction failed");
    }
    auto p=[&](int x,int y){return s.engine.toScriptValue(QVariantList{x,y});};
    s.call("begin",{"diagonal",p(1,2),0});s.call("place",{p(12,23)});
    auto items=[&]{return s.call("document").property("items");};
    if(items().property("length").toInt()!=committed+1)throw std::runtime_error("Rectangle placement failed");
}
