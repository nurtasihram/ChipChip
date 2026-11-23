#pragma once
#include <QtWidgets>
#include <QSvgRenderer>

class ButtonHint final : public QWidget {
    QString text;
    QSvgRenderer scene;
    QRect textArea,visualArea;
    void paintEvent(QPaintEvent *) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        p.setBrush(QColor("#101d30"));p.setPen(QColor("#526989"));
        p.drawRoundedRect(QRectF(rect()).adjusted(.5,.5,-.5,-.5),3,3);
        p.setPen(QColor("#e9f0fc"));
        p.drawText(textArea,Qt::AlignVCenter|Qt::TextWordWrap,text);
        if(scene.isValid()){
            p.setPen(Qt::NoPen);p.setBrush(QColor("#172438"));p.drawRoundedRect(visualArea,4,4);
            scene.render(&p,visualArea);
        }
    }
public:
    explicit ButtonHint(QWidget *owner):QWidget(owner,Qt::ToolTip|Qt::FramelessWindowHint|Qt::WindowTransparentForInput){
        setAttribute(Qt::WA_TranslucentBackground);setAttribute(Qt::WA_ShowWithoutActivating);
        auto f=QFontDatabase::systemFont(QFontDatabase::GeneralFont);f.setPixelSize(13);setFont(f);
        setAccessibleName(owner->accessibleName());
    }
    void display(QWidget *owner,const QString &message,const QString &svg){
        const QRect screen=owner->screen()->availableGeometry();
        text=message;
        scene.load(svg.toUtf8());
        const int maxWidth=qMax(1,qMin(298,screen.width()-38));
        const QSize graphic=scene.defaultSize();
        const int width=qMin(maxWidth,qMax(graphic.width(),fontMetrics().horizontalAdvance(text)));
        const int lines=fontMetrics().boundingRect(QRect(0,0,width,10000),Qt::TextWordWrap,text).height();
        textArea=QRect(11,8,width,qMax(18,lines));
        const QSize fitted=graphic.isEmpty()?QSize():graphic.scaled(qMin(width,graphic.width()),graphic.height(),Qt::KeepAspectRatio);
        visualArea=QRect(QPoint(11,textArea.bottom()+9),fitted);
        resize(width+22,(scene.isValid()?visualArea.bottom():textArea.bottom())+9);
        const auto anchor=QRect(owner->mapToGlobal(QPoint()),owner->size());
        move(qBound(screen.left()+8,anchor.center().x()-this->width()/2,screen.right()-this->width()-7),
             anchor.bottom()+height()+14<screen.bottom()?anchor.bottom()+8:qMax(screen.top()+8,anchor.top()-height()-7));
        show();update();
    }
};
