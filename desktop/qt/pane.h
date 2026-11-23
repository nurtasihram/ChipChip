#pragma once
#include "native.h"
#include <optional>
#ifdef Q_OS_WIN
#include <qt_windows.h>
#include <dwmapi.h>
#endif

class Pane : public QMainWindow {
    static constexpr int cornerRadius=10;
    QWidget *board;
    QFrame *title;
    QToolButton *captionButton=nullptr;
    QPoint captionPress;
    QLabel *handle;
    QHash<QWidget*,Qt::Edges> grips;
    std::optional<QPoint> attachment,origin;
    QRect original;
    Qt::Edges edges;
    QTimer follow;
    void followBoard(){
        if(!board||!attachment||origin)return;
        if(width()>board->width()||height()>board->height()){attachment.reset();return;}
        attachment=QPoint(qBound(0,attachment->x(),board->width()-width()),qBound(0,attachment->y(),board->height()-height()));
        move(board->mapToGlobal(*attachment));
    }
    void finish(){
        if(!origin)return;
        origin.reset();if(mouseGrabber()==this)releaseMouse();
        if(board){
            auto local=board->mapFromGlobal(pos());
            if(board->rect().contains(QRect(local,size())))attachment=local;else attachment.reset();
        }
    }
protected:
    bool eventFilter(QObject *obj,QEvent *event) override {
        if(board&&(obj==board||obj==board->window())&&(event->type()==QEvent::Move||event->type()==QEvent::Resize))follow.start(0);
        if(captionButton && obj==captionButton){
            if(event->type()==QEvent::MouseButtonPress)captionPress=static_cast<QMouseEvent*>(event)->globalPosition().toPoint();
            if(event->type()==QEvent::MouseMove){
                auto mouse=static_cast<QMouseEvent*>(event);
                if(mouse->buttons()&Qt::LeftButton && (mouse->globalPosition().toPoint()-captionPress).manhattanLength()>=QApplication::startDragDistance()){
                    captionButton->setDown(false);
                    if(windowHandle()->startSystemMove())return true;
                }
            }
        }
        auto widget=qobject_cast<QWidget*>(obj);
        if(event->type()==QEvent::MouseButtonPress&&(obj==handle||grips.contains(widget))&&!isFullScreen()){
            auto mouse=static_cast<QMouseEvent*>(event);if(mouse->button()!=Qt::LeftButton)return false;
            edges=grips.value(widget);original=geometry();origin=mouse->globalPosition().toPoint();attachment.reset();grabMouse(widget->cursor());return true;
        }
        return QMainWindow::eventFilter(obj,event);
    }
#ifdef Q_OS_WIN
    bool nativeEvent(const QByteArray &type,void *message,qintptr *result) override {
        auto msg=static_cast<MSG*>(message);
        if(msg->message==WM_SYSCOMMAND){
            switch(msg->wParam & 0xfff0){
                case SC_MAXIMIZE: showMaximized();*result=0;return true;
                case SC_MINIMIZE: showMinimized();*result=0;return true;
                case SC_RESTORE: showNormal();*result=0;return true;
            }
        }
        if(msg->message==WM_NCCALCSIZE && msg->wParam){
            if(IsZoomed(msg->hwnd)){
                MONITORINFO monitor{sizeof(MONITORINFO)};
                if(GetMonitorInfoW(MonitorFromWindow(msg->hwnd,MONITOR_DEFAULTTONEAREST),&monitor))
                    reinterpret_cast<NCCALCSIZE_PARAMS*>(msg->lParam)->rgrc[0]=monitor.rcWork;
            }
            *result=0;return true;
        }
        if(msg->message==WM_ACTIVATE || msg->message==WM_DWMCOMPOSITIONCHANGED){
            const MARGINS frame{1,1,1,1};
            DwmExtendFrameIntoClientArea(msg->hwnd,&frame);
        }
        return QMainWindow::nativeEvent(type,message,result);
    }
#endif
    void mouseMoveEvent(QMouseEvent *event) override {
        if(!origin)return QMainWindow::mouseMoveEvent(event);
        auto d=event->globalPosition().toPoint()-*origin;auto r=original;
        if(!edges)r.translate(d);
        if(edges&Qt::LeftEdge)r.setLeft(qMin(r.right()-minimumWidth()+1,r.left()+d.x()));
        if(edges&Qt::RightEdge)r.setRight(qMax(r.left()+minimumWidth()-1,r.right()+d.x()));
        if(edges&Qt::TopEdge)r.setTop(qMin(r.bottom()-minimumHeight()+1,r.top()+d.y()));
        if(edges&Qt::BottomEdge)r.setBottom(qMax(r.top()+minimumHeight()-1,r.bottom()+d.y()));
        setGeometry(r);
    }
    void mouseReleaseEvent(QMouseEvent *event) override {if(origin)finish();else QMainWindow::mouseReleaseEvent(event);}
    bool event(QEvent *event) override {
        if(event->type()==QEvent::Hide||event->type()==QEvent::WindowDeactivate||event->type()==QEvent::UngrabMouse)finish();
        return QMainWindow::event(event);
    }
    void paintEvent(QPaintEvent *event) override {
        QPainter painter(this);
        painter.setClipRegion(event->region());
        painter.setRenderHint(QPainter::Antialiasing);
        painter.setPen(Qt::NoPen);
        painter.setBrush(QColor("#101a2b"));
        const int radius=!testAttribute(Qt::WA_TranslucentBackground)||isFullScreen()||isMaximized()?0:cornerRadius;
        painter.drawRoundedRect(QRectF(rect()),radius,radius);
    }
    void resizeEvent(QResizeEvent *event) override {
        QMainWindow::resizeEvent(event);layoutTitle();
        for(auto it=grips.begin();it!=grips.end();++it){
            auto e=it.value();bool left=e&Qt::LeftEdge,right=e&Qt::RightEdge,top=e&Qt::TopEdge,bottom=e&Qt::BottomEdge;
            int side=3;
            it.key()->setGeometry(right?width()-side:left?0:side,bottom?height()-side:top?0:side,
                left||right?side:width()-2*side,top||bottom?side:height()-2*side);
            it.key()->raise();
        }
    }
    void layoutTitle(){
        const int inset=!testAttribute(Qt::WA_TranslucentBackground)||isFullScreen()||isMaximized()?0:cornerRadius;
        if(captionButton){
            auto font=QFontDatabase::systemFont(QFontDatabase::GeneralFont);
            font.setPixelSize(width()<800?14:16);font.setBold(true);
            captionButton->setFont(font);
            captionButton->setFixedWidth(qRound(QFontMetricsF(font).horizontalAdvance(captionButton->text())+29));
        }
        const int height=title->sizeHint().height();
        if(board)title->setGeometry(inset,0,width()-2*inset,height);
        else title->setGeometry(0,0,title->sizeHint().width(),height);
        setContentsMargins(0,board?height:inset,0,inset);
        title->raise();
    }
public:
    QHBoxLayout *strip;
    explicit Pane(QString caption,QWidget *owner=nullptr):QMainWindow(owner,(owner?Qt::WindowFlags(Qt::Tool):Qt::Window|Qt::WindowSystemMenuHint|Qt::WindowMinMaxButtonsHint|Qt::WindowCloseButtonHint)|Qt::FramelessWindowHint),board(owner){
        setAttribute(Qt::WA_TranslucentBackground,QGuiApplication::platformName()!="windows");
        title=new QFrame(this);title->setObjectName("paneTitle");strip=new QHBoxLayout(title);strip->setContentsMargins(4,3,4,3);strip->setSpacing(4);
        handle=new QLabel(caption,title);handle->setContentsMargins(4,0,4,0);handle->setAccessibleName("拖動窗格");
        handle->installEventFilter(this);strip->addWidget(handle,1);
        setStyleSheet("QFrame#paneTitle{background:#152238;border-bottom:1px solid #40536e}"
                      "QLabel{color:#d9e9fb;background:transparent}"
                      "QToolButton{color:#d9e9fb;background:#1c2a42;border:1px solid #40536e;border-radius:3px;padding:3px}"
                      "QToolButton:hover{background:#29435e} QToolButton:checked,QToolButton:pressed{background:#315b8d}"
                      "QToolButton:focus{border-color:#7cb4fa}");
        setWindowTitle(caption);setMinimumSize(150,70);
#ifdef Q_OS_WIN
        if(QGuiApplication::platformName()=="windows"){
            const HWND hwnd=reinterpret_cast<HWND>(winId());
            const auto style=GetWindowLongPtrW(hwnd,GWL_STYLE);
            SetWindowLongPtrW(hwnd,GWL_STYLE,style|WS_CAPTION|WS_SYSMENU|WS_THICKFRAME|(board?0:WS_MINIMIZEBOX|WS_MAXIMIZEBOX));
            // Windows 11 constants are absent from older MinGW headers.
            constexpr DWORD windowCornerPreference=33;
            constexpr int corners=2; // DWMWCP_ROUND
            DwmSetWindowAttribute(hwnd,windowCornerPreference,&corners,sizeof(corners));
            SetWindowPos(hwnd,nullptr,0,0,0,0,SWP_FRAMECHANGED|SWP_NOMOVE|SWP_NOSIZE|SWP_NOZORDER|SWP_NOACTIVATE);
            auto systemMenu=new QShortcut(QKeySequence(Qt::ALT|Qt::Key_Space),this);
            connect(systemMenu,&QShortcut::activated,this,[this,hwnd]{
                POINT origin{0,LONG(qRound(title->height()*devicePixelRatioF()))};ClientToScreen(hwnd,&origin);
                auto menu=GetSystemMenu(hwnd,FALSE);
                if(!board){
                    EnableMenuItem(menu,SC_MINIMIZE,MF_BYCOMMAND|(IsIconic(hwnd)?MF_GRAYED:MF_ENABLED));
                    EnableMenuItem(menu,SC_MAXIMIZE,MF_BYCOMMAND|(IsZoomed(hwnd)?MF_GRAYED:MF_ENABLED));
                    EnableMenuItem(menu,SC_RESTORE,MF_BYCOMMAND|(IsIconic(hwnd)||IsZoomed(hwnd)?MF_ENABLED:MF_GRAYED));
                }
                auto command=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_RIGHTBUTTON,origin.x,origin.y,0,hwnd,nullptr);
                if(command)PostMessageW(hwnd,WM_SYSCOMMAND,command,0);
            });
        }
#endif
        for(Qt::Edges h:{Qt::Edges(),Qt::Edges(Qt::LeftEdge),Qt::Edges(Qt::RightEdge)})
            for(Qt::Edges v:{Qt::Edges(),Qt::Edges(Qt::TopEdge),Qt::Edges(Qt::BottomEdge)}){
                if(!h&&!v)continue;
                auto grip=new QWidget(this);grips[grip]=h|v;grip->installEventFilter(this);
                grip->setCursor(!h?Qt::SizeVerCursor:!v?Qt::SizeHorCursor:((h==Qt::LeftEdge)==(v==Qt::TopEdge)?Qt::SizeFDiagCursor:Qt::SizeBDiagCursor));
            }
        if(board){attachment=QPoint(12,12);board->installEventFilter(this);board->window()->installEventFilter(this);}
        follow.setSingleShot(true);connect(&follow,&QTimer::timeout,this,[this]{followBoard();});
    }
    QToolButton *titleTab(){
        handle->hide();strip->setContentsMargins(0,0,0,0);
        captionButton=new QToolButton(title);captionButton->setText(windowTitle());
        captionButton->setStyleSheet(QStringLiteral("QToolButton{background:#152238;color:#eaf1ff;border:0;border-bottom:1px solid #40536e;border-right:1px solid #40536e;border-radius:0;border-top-left-radius:%1px;border-bottom-right-radius:%1px;padding:0} QToolButton:focus{border-bottom-color:#7cb4fa}").arg(cornerRadius));
        title->setStyleSheet("QFrame#paneTitle{background:transparent;border:0}");
        captionButton->setFixedHeight(60);captionButton->installEventFilter(this);strip->addWidget(captionButton);layoutTitle();
        return captionButton;
    }
    void openAt(QPoint local){if(attachment){attachment=local;followBoard();}show();raise();}
    void titleButton(QToolButton *button,bool first=false){if(first)strip->insertWidget(0,button);else strip->addWidget(button);layoutTitle();}
};
