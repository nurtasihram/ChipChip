#pragma once
#include <QWidget>
#include <memory>
class Window;
std::unique_ptr<QWidget> createWindow();
