/* Platform-neutral button descriptors and local language packs. */
(function(root){
'use strict';
const packs = {
  "zh-Hant": {
    "settings.measurement": "計量單位",
    "settings.snap": "吸附",
    "settings.selection": "選取",
    "pane.close.hint": "選用關閉鍵，關閉整個繪圖窗格。",
    "pane.close": "關閉繪圖窗格",
    "panel.close.hint": "選用收起鍵，收起工具面板，保留畫布。",
    "panel.close": "收起面板",
    "canvas.pan.hint": "選用平移工具，在畫布按住並拖動，放開即停止平移。",
    "canvas.pan": "平移畫布",
    "rect.title": "矩形畫法",
    "done": "完成",
    "default": "（預設）",
    "canvas.help": "右鍵或 Shift+F10 開啟繪圖工具；Esc 取消繪製",
    "canvas.cancel": "取消繪製",
    "pane.drag": "拖動窗格",
    "rect.diagonal": "對角線",
    "rect.diagonal.steps": [
      "指定起點",
      "指定對角點"
    ],
    "rect.edge": "邊與寬／高",
    "rect.edge.steps": [
      "指定邊的第一端",
      "指定邊的第二端",
      "移動決定垂直尺寸，點擊完成"
    ],
    "rect.right-triangle": "直三角板",
    "rect.right-triangle.steps": [
      "指定對角線起點",
      "指定對角線終點",
      "沿直徑圓選直角頂點，點擊完成"
    ],
    "rect.edge-midpoint": "邊中點、半寬與高",
    "rect.edge-midpoint.steps": [
      "指定邊中點",
      "移動決定半寬與高，點擊完成"
    ],
    "file.open": "打開",
    "file.save": "保存",
    "file.saveAs": "另存",
    "file.rename": "編輯標題",
    "language": "語言",
    "unit.localized": "本地化量詞",
    "fullscreen.on": "全螢幕",
    "fullscreen.off": "退出全螢幕"
  },
  "en": {
    "settings.measurement": "Measurement Units",
    "settings.snap": "Snapping",
    "settings.selection": "Selection",
    "pane.close.hint": "Activate Close to close the drawing pane.",
    "pane.close": "Close drawing pane",
    "panel.close.hint": "Activate Close to hide the panel and keep the canvas visible.",
    "panel.close": "Close panel",
    "canvas.pan.hint": "Select Pan, then press and drag on the canvas. Release to stop panning.",
    "canvas.pan": "Pan canvas",
    "rect.title": "Rectangle methods",
    "done": "Done",
    "default": " (default)",
    "canvas.help": "Right-click or press Shift+F10 for drawing tools. Press Esc to cancel.",
    "canvas.cancel": "Cancel drawing",
    "pane.drag": "Drag pane",
    "rect.diagonal": "Diagonal",
    "rect.diagonal.steps": [
      "Place the first corner",
      "Place the opposite corner"
    ],
    "rect.edge": "Edge and width or height",
    "rect.edge.steps": [
      "Place the first end of the edge",
      "Place the other end",
      "Move to set the perpendicular size, then click to finish"
    ],
    "rect.right-triangle": "Right triangle",
    "rect.right-triangle.steps": [
      "Place the start of the diagonal",
      "Place the end of the diagonal",
      "Choose the right-angle vertex on the circle, then click to finish"
    ],
    "rect.edge-midpoint": "Edge midpoint, half-width and height",
    "rect.edge-midpoint.steps": [
      "Place the edge midpoint",
      "Move to set the half-width and height, then click to finish"
    ],
    "file.open": "Open",
    "file.save": "Save",
    "file.saveAs": "Save As",
    "file.rename": "Edit Title",
    "language": "Language",
    "unit.localized": "Localized unit names",
    "fullscreen.on": "Fullscreen",
    "fullscreen.off": "Exit Fullscreen"
  }
};
const buttons = {
  "pane.close": {
    "action": "pane.close",
    "alt": "pane.close",
    "hint": "pane.close.hint",
    "visual": {"kind":"animation","id":"pane.close"},
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><path d=\"m5 5 14 14M19 5 5 19\"/></svg>"
  },
  "panel.close": {
    "action": "panel.close",
    "alt": "panel.close",
    "hint": "panel.close.hint",
    "visual": {"kind":"animation","id":"panel.close"},
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><path d=\"m5 5 14 14M19 5 5 19\"/></svg>"
  },
  "canvas.pan": {
    "action": "canvas.pan",
    "alt": "canvas.pan",
    "hint": "canvas.pan.hint",
    "visual": {"kind":"animation","id":"canvas.pan"},
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><path d=\"M4 12h16m-4-4 4 4-4 4M8 8l-4 4 4 4\"/></svg>"
  },
  "rect.diagonal": {
    "action": "diagonal",
    "alt": "rect.diagonal",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 32 32\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><rect x=\"6\" y=\"8\" width=\"20\" height=\"16\"/><path d=\"M6 8 26 24\" stroke-dasharray=\"2 2\"/><circle cx=\"6\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/><circle cx=\"26\" cy=\"24\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/></svg>",
    "hint": "rect.diagonal.steps",
    "visual": {
      "kind": "animation",
      "id": "diagonal"
    }
  },
  "rect.edge": {
    "action": "edge",
    "alt": "rect.edge",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 32 32\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><rect x=\"6\" y=\"8\" width=\"20\" height=\"16\"/><path d=\"M6 8H26M26 8V24\" stroke-dasharray=\"2 2\"/><circle cx=\"6\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/><circle cx=\"26\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/></svg>",
    "hint": "rect.edge.steps",
    "visual": {
      "kind": "animation",
      "id": "edge"
    }
  },
  "rect.right-triangle": {
    "action": "right-triangle",
    "alt": "rect.right-triangle",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 32 32\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><rect x=\"6\" y=\"8\" width=\"20\" height=\"16\"/><path d=\"M6 8 26 24M6 8H26V24\" stroke-dasharray=\"2 2\"/><circle cx=\"6\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/><circle cx=\"26\" cy=\"24\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/><circle cx=\"26\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/></svg>",
    "hint": "rect.right-triangle.steps",
    "visual": {
      "kind": "animation",
      "id": "right-triangle"
    }
  },
  "rect.edge-midpoint": {
    "action": "edge-midpoint",
    "alt": "rect.edge-midpoint",
    "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"tool-icon\" viewBox=\"0 0 32 32\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><rect x=\"6\" y=\"8\" width=\"20\" height=\"16\"/><path d=\"M16 8H26V24\" stroke-dasharray=\"2 2\"/><circle cx=\"16\" cy=\"8\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/><circle cx=\"26\" cy=\"24\" r=\"2.3\" fill=\"#ffd166\" stroke=\"#172438\" stroke-width=\".8\"/></svg>",
    "hint": "rect.edge-midpoint.steps",
    "visual": {
      "kind": "animation",
      "id": "edge-midpoint"
    }
  }
};
// Both adapters translate their native input into these device-neutral signals.
const interactions = {
    hover: {mouse:'hover', pen:'hover', keyboard:'focus'},
    primary: {touch:'tap', mouse:'tap', pen:'tap', keyboard:'activate'},
    secondary: {touch:'hold', mouse:'secondary', pen:'hold', keyboard:'menu'},
    drag: {touch:'move', mouse:'move', pen:'move'}
};
function interaction(device,signal) {
    for(const name of Object.keys(interactions)){
        if(interactions[name][device]===signal)return name;
    }
    return null;
}
const holdMs=550, dragDistance=6;
function createButtonGesture() {
    let press=null;
    return function update(type,device,x=0,y=0){
        if(type==='down'){press={device,x,y,mode:null};return null;}
        if(type==='cancel'){press=null;return null;}
        if(!press)return interaction(device,type);
        if(type==='hold'){
            if(press.mode)return null;
            press.mode=interaction(press.device,'hold');
            return press.mode;
        }
        if(type==='move'){
            if(press.mode==='secondary')return null;
            if(!press.mode && Math.hypot(x-press.x,y-press.y)<dragDistance)return null;
            press.mode=interaction(press.device,'move');
            return press.mode;
        }
        if(type==='up'){
            const result=press.mode ? null : interaction(press.device,'tap');
            press=null;
            return result;
        }
        return interaction(device,type);
    };
}
function locale(tag) { return /^en(?:[-_]|$)/i.test(tag || '') ? 'en' : 'zh-Hant'; }
function text(key, language) {
    const value = packs[locale(language)][key];
    if (!value) throw Error('Missing UI text: ' + key);
    return value;
}
function button(key, language) {
    const def = buttons[key];
    return {...def, alt:text(def.alt, language), hint:def.hint ? text(def.hint, language) : null};
}
// Both the HTML tooltip and the Qt SVG frame renderer supply this scene interface.
function workspaceButtonHelp(id, scene) {
    const {node, set, lerp} = scene;
    const pan = id === 'canvas.pan';
    const panel = id === 'panel.close';
    const board = node('rect', {x:12,y:14,width:220,height:122,rx:5,fill:'#26394e',stroke:'#9eb7cf'});
    const drawing = node('path', {d:'M40 93l30-41 25 41Z',fill:'none',stroke:'#69b8ff','stroke-width':3});
    const overlay = panel ? node('rect', {x:118,y:37,width:98,height:64,rx:4,fill:'#42566c',stroke:'#b4c7d9'}) : null;
    const target = panel ? {x:130,y:49} : {x:26,y:27};
    const start = {x:77,y:88}, end = {x:137,y:105};
    const icon = node('path', {d:pan?'M-8 0H8m-4-4 4 4-4 4M-4-4l-4 4 4 4':'M-5-5L5 5M5-5L-5 5',
        transform:'translate('+target.x+' '+target.y+')',fill:'none',stroke:'#fff','stroke-width':2});
    const pointer = node('path', {d:'M0 0v13l4-3 4 6 3-2-4-6 5-1Z',fill:'#fff','data-demo-pointer':''});
    const press = node('circle', {r:7,fill:'none',stroke:'#ffd166','stroke-width':2});
    const events = [{time:.22,kind:'down',p:target},{time:.30,kind:'up',p:target}];
    if (pan) events.push({time:.49,kind:'down',p:start},{time:.82,kind:'up',p:end});
    const phase = (t,a,b) => Math.max(0, Math.min(1,(t-a)/(b-a)));
    return scene.bind(t => {
        const delta = phase(t,.49,.82);
        let cursor = lerp({x:target.x+26,y:target.y+19},target,phase(t,0,.22));
        if (pan && t>=.30) cursor = t<.49 ? lerp(target,start,phase(t,.30,.49)) : lerp(start,end,delta);
        const closed = !pan && t>=.30;
        const visible = value => value ? 'visible' : 'hidden';
        set(board,{visibility:visible(!closed || panel)});
        set(drawing,{visibility:visible(!closed || panel),transform:'translate('+((end.x-start.x)*delta*(pan?1:0))+' '+((end.y-start.y)*delta*(pan?1:0))+')'});
        if (overlay) set(overlay,{visibility:visible(!closed)});
        set(icon,{visibility:visible(!closed),stroke:pan && t>=.30?'#ffd166':'#fff'});
        set(pointer,{transform:'translate('+cursor.x+' '+cursor.y+')'});
        set(press,{cx:cursor.x,cy:cursor.y,visibility:visible((t>=.22 && t<.30) || (pan && t>=.49 && t<.82))});
        scene.input(t,events);
    });
}
const english={'面板選項':'Panel options','計量單位':'Measurement Units','長度單位':'Length Units','角度單位':'Angle Units','分數／比例':'Fractions / Ratios','錨點':'Anchors','首個錨點':'First anchor','形狀':'Shape','圓形':'Circle','矩形':'Rectangle','綫條':'Lines','首個選取':'First selected','樣式':'Notation','約分':'Reduce','示例':'Example','用於縮放刻度與倍率吸附':'Used for scale graduations and snapped ratios','視圖':'View','格線':'Grid','旋轉':'Rotation','比例尺':'Scale','顯示':'Show','自動隱藏':'Auto hide','透明度':'Opacity','座標系':'Coordinates','正交系':'Cartesian','極座標':'Polar','座標系指示器':'Coordinate indicator','指示器':'Compass','長度':'Length','公制':'Metric','英制':'Imperial','單位':'Unit','小數精度':'Decimals','角度':'Angle','角度精度':'Angle precision','360° 制':'Degrees','弧度制':'Radians','時分秒':'Clock','顯示原點':'Show origin','厚':'Width','顯示格線':'Show grid','遞進':'Increment','等分':'Equal','周數':'Turns','綫模式':'Lines','點模式':'Points','大小':'Size','鋪滿':'Fill viewport','溢出':'Overflow','小時':'Hours','分鐘':'Minutes','秒':'Seconds','毫秒':'Milliseconds','微秒':'Microseconds','納秒':'Nanoseconds'};
const unitNames={clock:['時分秒','hours:minutes:seconds'],km:['公里','kilometre'],ft:['英尺','foot'],m:['米','metre'],cm:['厘米','centimetre'],mm:['毫米','millimetre'],um:['微米','micrometre'],inch:['英寸','inch'],mil:['密耳','mil'],px:['像素','pixel'],'°':['度','degree'],rad:['弧度','radian'],h:['小時','hour'],min:['分鐘','minute'],s:['秒','second'],ms:['毫秒','millisecond'],'µs':['微秒','microsecond'],ns:['納秒','nanosecond'],count:['個','count'],ratio:['分數','fraction'],view:['視圖比','view'],'%':['百分比','%'],'‰':['千分比','‰'],'‱':['萬分比','‱']};
for(const code of ['km','m','cm','mm','um','ft','inch','mil'])unitNames[code+'2']=['平方'+unitNames[code][0],unitNames[code][1]+' squared'];
root.ChipUIDefinitions = {locale,text,button,workspaceButtonHelp,english,unitNames,interactions,interaction,createButtonGesture,holdMs,
    rectangleButtons:language => Object.keys(buttons).filter(key => key.startsWith('rect.')).map(key => button(key,language))};
})(globalThis);
