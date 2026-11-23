#pragma once
#include "native.h"
#include <optional>

class Pane : public QMainWindow {
    QWidget *board;
    QFrame *title;
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
        auto widget=qobject_cast<QWidget*>(obj);
        if(event->type()==QEvent::MouseButtonPress&&(obj==handle||grips.contains(widget))&&!isFullScreen()){
            auto mouse=static_cast<QMouseEvent*>(event);if(mouse->button()!=Qt::LeftButton)return false;
            edges=grips.value(widget);original=geometry();origin=mouse->globalPosition().toPoint();attachment.reset();grabMouse(widget->cursor());return true;
        }
        return QMainWindow::eventFilter(obj,event);
    }
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
    void resizeEvent(QResizeEvent *event) override {
        QMainWindow::resizeEvent(event);title->adjustSize();title->raise();
        if(isFullScreen()||isMaximized())clearMask();else{
            QPainterPath shape;shape.addRoundedRect(rect(),6,6);setMask(QRegion(shape.toFillPolygon().toPolygon()));
        }
        for(auto it=grips.begin();it!=grips.end();++it){
            auto e=it.value();bool left=e&Qt::LeftEdge,right=e&Qt::RightEdge,top=e&Qt::TopEdge,bottom=e&Qt::BottomEdge;
            int side=3;
            it.key()->setGeometry(right?width()-side:left?0:side,bottom?height()-side:top?0:side,
                left||right?side:width()-2*side,top||bottom?side:height()-2*side);
            it.key()->raise();
        }
    }
public:
    QHBoxLayout *strip;
    explicit Pane(QString caption,QWidget *owner=nullptr):QMainWindow(owner,(owner?Qt::Tool:Qt::Window)|Qt::FramelessWindowHint),board(owner){
        title=new QFrame(this);strip=new QHBoxLayout(title);strip->setContentsMargins(3,2,0,2);strip->setSpacing(2);
        handle=new QLabel(caption,title);handle->setContentsMargins(3,0,36,0);handle->setAccessibleName("拖動窗格");
        handle->installEventFilter(this);strip->addWidget(handle);
        title->setStyleSheet("QFrame{background:#152238;color:#d9e9fb;border-radius:4px} QToolButton{color:#d9e9fb}");
        setWindowTitle(caption);setMinimumSize(150,70);
        for(Qt::Edges h:{Qt::Edges(),Qt::Edges(Qt::LeftEdge),Qt::Edges(Qt::RightEdge)})
            for(Qt::Edges v:{Qt::Edges(),Qt::Edges(Qt::TopEdge),Qt::Edges(Qt::BottomEdge)}){
                if(!h&&!v)continue;
                auto grip=new QWidget(this);grips[grip]=h|v;grip->installEventFilter(this);
                grip->setCursor(!h?Qt::SizeVerCursor:!v?Qt::SizeHorCursor:((h==Qt::LeftEdge)==(v==Qt::TopEdge)?Qt::SizeFDiagCursor:Qt::SizeBDiagCursor));
            }
        if(board){attachment=QPoint(12,12);board->installEventFilter(this);board->window()->installEventFilter(this);}
        follow.setSingleShot(true);connect(&follow,&QTimer::timeout,this,[this]{followBoard();});
    }
    void openAt(QPoint local){if(attachment){attachment=local;followBoard();}show();raise();}
    void titleButton(QToolButton *button,bool first=false){if(first)strip->insertWidget(0,button);else strip->addWidget(button);title->adjustSize();title->raise();}
    int titleHeight(){title->adjustSize();return title->height();}
};
