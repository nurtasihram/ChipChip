/* Platform-neutral button descriptors and gestures for Chip applications. */
(function(root){
'use strict';
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

function createButtonModel({buttons,packs,locale}) {
    function text(key, language) {
        const pack = packs[locale(language)];
        if (!pack || !Object.hasOwn(pack,key)) throw Error('Missing UI text: ' + key);
        return pack[key];
    }
    function button(key, language) {
        if (!Object.hasOwn(buttons,key)) throw Error('Unknown UI button: ' + key);
        const definition = buttons[key];
        return {...definition,alt:text(definition.alt,language),hint:definition.hint ? text(definition.hint,language) : null};
    }
    return {text,button};
}
root.ChipUIButtonModel = {create:createButtonModel,interactions,interaction,createButtonGesture,holdMs};
const packs={
  "zh-Hant": {
    "settings.measurement": "計量單位",
    "settings.snap": "吸附",
    "settings.selection": "選取",
    "done": "完成",
    "default": "（預設）",
    "pane.drag": "拖動窗格",
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
    "done": "Done",
    "default": " (default)",
    "pane.drag": "Drag pane",
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
function locale(tag) { return /^en(?:[-_]|$)/i.test(tag || '') ? 'en' : 'zh-Hant'; }
const english={'面板選項':'Panel options','計量單位':'Measurement Units','長度單位':'Length Units','角度單位':'Angle Units','分數／比例':'Fractions / Ratios','錨點':'Anchors','首個錨點':'First anchor','形狀':'Shape','圓形':'Circle','矩形':'Rectangle','綫條':'Lines','首個選取':'First selected','樣式':'Notation','約分':'Reduce','示例':'Example','用於縮放刻度與倍率吸附':'Used for scale graduations and snapped ratios','視圖':'View','格線':'Grid','旋轉':'Rotation','比例尺':'Scale','顯示':'Show','自動隱藏':'Auto hide','透明度':'Opacity','座標系':'Coordinates','正交系':'Cartesian','極座標':'Polar','座標系指示器':'Coordinate indicator','指示器':'Compass','長度':'Length','公制':'Metric','英制':'Imperial','單位':'Unit','小數精度':'Decimals','角度':'Angle','角度精度':'Angle precision','360° 制':'Degrees','弧度制':'Radians','時分秒':'Clock','顯示原點':'Show origin','厚':'Width','顯示格線':'Show grid','遞進':'Increment','等分':'Equal','周數':'Turns','綫模式':'Lines','點模式':'Points','大小':'Size','鋪滿':'Fill viewport','溢出':'Overflow','小時':'Hours','分鐘':'Minutes','秒':'Seconds','毫秒':'Milliseconds','微秒':'Microseconds','納秒':'Nanoseconds'};
const unitNames={clock:['時分秒','hours:minutes:seconds'],km:['公里','kilometre'],ft:['英尺','foot'],m:['米','metre'],cm:['厘米','centimetre'],mm:['毫米','millimetre'],um:['微米','micrometre'],inch:['英寸','inch'],mil:['密耳','mil'],px:['像素','pixel'],'°':['度','degree'],rad:['弧度','radian'],h:['小時','hour'],min:['分鐘','minute'],s:['秒','second'],ms:['毫秒','millisecond'],'µs':['微秒','microsecond'],ns:['納秒','nanosecond'],count:['個','count'],ratio:['分數','fraction'],view:['視圖比','view'],'%':['百分比','%'],'‰':['千分比','‰'],'‱':['萬分比','‱']};
for(const code of ['km','m','cm','mm','um','ft','inch','mil'])unitNames[code+'2']=['平方'+unitNames[code][0],unitNames[code][1]+' squared'];
const {text}=createButtonModel({packs,buttons:{},locale});
root.ChipUIDefinitions={locale,text,english,unitNames,interaction,interactions,createButtonGesture,holdMs};
})(globalThis);
