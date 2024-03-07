/* draw-board.component.ts */
import {HostListener, Component, OnInit, AfterViewInit, ElementRef, ViewChild} from '@angular/core';
import * as PIXI from 'pixi.js';
import * as _ from 'lodash'
import {NgClass} from "@angular/common";
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-draw-board',
  standalone: true,
  imports: [
    NgClass
  ],
  templateUrl: './draw-board.component.html',
  styleUrl: './draw-board.component.css'
})
export class DrawBoardComponent implements OnInit, AfterViewInit {
  @ViewChild('contentArea', {static: true}) contentArea!: ElementRef;
  @ViewChild('header', {static: true}) headerArea!: ElementRef;

  private dragging: boolean = false;
  public showAxis: boolean = true
  public showAxisNumber: boolean = true
  public showAxisTopNumber: boolean = false
  public showAxisLeftNumber: boolean = false
  public showGrid: boolean = true
  public showCurve: boolean = true

  // header
  private isDraggingHeader = false;
  private headerPosition = { x: 0, y: 0 };
  @ViewChild('header', { static: false }) headerElement!: ElementRef;


  private previousPosition: { x: number; y: number } | null = null;

  private app!: PIXI.Application;

  private graphicsObjects: { [key: string]: PIXI.Graphics } = {}; // 使用对象来存储画布元素
  private textGraphicsObjects: PIXI.Text[] = []; // 使用对象来存储画布元素
  private topAxisGraphicsObjects: PIXI.Text[] = []; // 使用对象来存储画布元素
  private leftAxisGraphicsObjects: PIXI.Text[] = []; // 使用对象来存储画布元素
  private fnGraphicsObjects: PIXI.Graphics[] = []; // 使用对象来存储画布元素

  constructor() {
  }

  public config = {
    width: 1800,
    height: 900,
    grid: 35,
    step: 0.01,
    background: "#323131",
    gridColor: "#b4b6b4",
    textColor: "#00FFFF",
    axisColor: "#FFFFFF",
    startNum: -20,
    endNum: 20,
    startY: -20,
    endY: 20,
    headerAreaHeight: 80,
    midX: 1000,
    midY: 500,
    gridLineWidth: 1,
    curveLineWidth: 1,
    dragAble: false,
    dragAreaAlpha: 0.0001,
    colorStyle: "dark",
    lightColor: {
      background: "#FFFFFF",
      gridColor: "#AAAAAA",
      textColor: "#000000",
      axisColor: "#222222",
    },
    darkColor: {
      background: "#323131",
      gridColor: "#b4b6b4",
      textColor: "#00FFFF",
      axisColor: "#FFFFFF",
    }
  }
  public confBak = {
    grid: 35,
    curveLineWidth: 1,
  }

  ngOnInit(): void {
    document.body.style.margin = "0";

    // 添加拖动事件监听器
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());

  }

  onMouseDown(event: MouseEvent) {
    this.isDraggingHeader = true;
    // 记录点击位置
    this.headerPosition.x = event.clientX - this.headerElement.nativeElement.getBoundingClientRect().left;
    this.headerPosition.y = event.clientY - this.headerElement.nativeElement.getBoundingClientRect().top;
    event.preventDefault(); // 防止默认行为
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDraggingHeader) return;
    // 更新头部位置
    this.headerElement.nativeElement.style.left = (event.clientX - this.headerPosition.x) + 'px';
    this.headerElement.nativeElement.style.top = (event.clientY - this.headerPosition.y) + 'px';
  }

  onMouseUp() {
    this.isDraggingHeader = false;
  }




  // HostListener装饰器可以监听宿主窗口的事件
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    // 可以选择调用一个函数来处理resize逻辑
    this.handleResize();
  }

  private handleResize(): void {
    // 更新配置信息，比如网格尺寸等
    this.initConfig();

    // 重新设置Pixi应用的尺寸
    this.app.renderer.resize(this.config.width, this.config.height);

    // 清除旧的所有图形
    this.app.stage.removeChildren();

    // 重回网格
    this.drawGrid()
    // 画坐标轴
    this.drawAxis()

    // 坐标轴重绘
    this.calculateAxisNumbers()
    this.drawAxesNumber()
    this.createDragArea()

    // 函数重绘
    this.drawFn()
  }


  ngAfterViewInit(): void {
    // 初始化pixi
    this.initPixiApp();
    // 初始化配置
    this.initConfig();
    // 画坐标轴数字
    this.drawAxesNumber()
    // 画网格
    this.drawGrid();
    // 画坐标轴
    this.drawAxis()
    // 初始化点击区域
    this.createDragArea();
    // 画函数
    this.drawFn()

    if (this.headerElement && this.headerElement.nativeElement) {
      this.headerElement.nativeElement.addEventListener('mousedown', (e: MouseEvent) => this.onMouseDown(e));
    }
  }

  reRender() {
    // 清除全部
    this.app.stage.removeChildren();
    // 画坐标轴数字
    this.drawAxesNumber()
    // 画网格
    this.drawGrid();
    // 画坐标轴
    this.drawAxis()
    // 初始化点击区域
    this.createDragArea();
    // 画函数
    this.drawFn()
  }


  private createDragArea() {
    if (!this.config.dragAble) {
      return
    }
    let dragArea = new PIXI.Graphics();
    //dragArea.beginFill(0x000000, 0); // 透明填充
    // 点击区域
    dragArea.beginFill("#00ff00", this.config.dragAreaAlpha); // 透明填充
    dragArea.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    dragArea.endFill();
    dragArea.interactive = true;
    dragArea.on('pointerdown', this.onDragStart.bind(this));
    dragArea.on('pointermove', this.onDragMove.bind(this));
    dragArea.on('pointerup', this.onDragEnd.bind(this));
    this.app.stage.addChild(dragArea);
    this.graphicsObjects['dragReact'] = dragArea
  }

  // 拖拽开始
  private onDragStart(event: MouseEvent): void {
    this.dragging = true;
    this.previousPosition = {x: event.clientX, y: event.clientY};
  }

  // 鼠标移动
  private onDragMove(event: MouseEvent): void {
    if (this.dragging && this.previousPosition) {
      const currentPosition = {x: event.clientX, y: event.clientY};
      const dx = currentPosition.x - this.previousPosition.x;
      const dy = currentPosition.y - this.previousPosition.y;

      this.config.midX += dx
      this.config.midY += dy

      // 更新画布中所有对象的位置
      this.app.stage.children.forEach((child) => {
        child.x += dx;
        child.y += dy;
      });

      // 更新上一个位置信息
      this.previousPosition = {...currentPosition};

      // 更新可拖拽区域大小和位置
      this.graphicsObjects['dragReact'].x = 0
      this.graphicsObjects['dragReact'].y = 0
      this.graphicsObjects['dragReact'].width += Math.abs(dx)
      this.graphicsObjects['dragReact'].height += Math.abs(dy)
    }
  }

  private onDragEnd(event: MouseEvent): void {
    this.dragging = false;
    this.previousPosition = null;

    // 网格重绘
    this.app.stage.removeChild(this.graphicsObjects['grid']);
    this.drawGrid()
    // 画坐标轴
    this.drawAxis()

    // 坐标轴数字重绘
    this.app.stage.removeChild(...this.textGraphicsObjects);
    this.calculateAxisNumbers()
    this.drawAxesNumber()

    // 函数重绘
    this.cleanFn()
    this.drawFn()

  }


  private initConfig() {
    this.config.width = this.contentArea.nativeElement.offsetWidth
    this.config.height = this.contentArea.nativeElement.offsetHeight
    this.config.headerAreaHeight = this.headerArea.nativeElement.offsetHeight
    this.config.endNum = Math.round(this.config.width / (this.config.grid * 2))
    this.config.startNum = -this.config.endNum
    this.config.endY = Math.round(this.config.height / (this.config.grid * 2))
    this.config.startY = -this.config.endY
    // x y 中间位置 原点位置
    this.config.midY = Math.round((this.config.height / this.config.grid) / 2) * this.config.grid
    this.config.midX = Math.round((this.config.width / this.config.grid) / 2) * this.config.grid
    console.log(this.config)
    this.confBak = _.cloneDeep(this.config)

    // let hours = new Date().getHours();
    // if (hours > 7 || hours < 6) {
    //   this.config.colorStyle = "dark"
    //   this.changeStyle()
    // } else {
    //   this.config.colorStyle = "light"
    //   this.changeStyle()
    // }

  }

  private calculateAxisNumbers(): void {
    // 基于midX和midY，计算X轴和Y轴的起始和结束数字
    this.config.startNum = -Math.ceil(this.config.midX / this.config.grid);
    this.config.endNum = Math.ceil((this.config.width - this.config.midX) / this.config.grid);
    this.config.startY = -Math.ceil((this.config.height - this.config.midY) / this.config.grid);
    this.config.endY = Math.ceil(this.config.midY / this.config.grid);
  }

  private initPixiApp(): void {
    let width = this.contentArea.nativeElement.offsetWidth;
    let height = this.contentArea.nativeElement.offsetHeight;
    this.app = new PIXI.Application({
      width: width,
      height: height,
      backgroundColor: this.config.background,
      preserveDrawingBuffer: true,
    });
    this.contentArea.nativeElement.appendChild(this.app.view);
  }

  private drawGrid() {
    if (!this.showGrid) {
      return
    }

    // 画网格
    const gridGraphics = new PIXI.Graphics();
    gridGraphics.lineStyle(this.config.gridLineWidth, this.config.gridColor, 1);

    // 画上半部分的横线
    for (let y = this.config.midY; y >= 0; y -= this.config.grid) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(this.config.width, y);
    }

    // 画下半部分的横线
    for (let y = this.config.midY; y <= this.config.height; y += this.config.grid) {
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(this.config.width, y);
    }

    // 画左半部分的竖线
    for (let x = this.config.midX; x >= 0; x -= this.config.grid) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, this.config.height);
    }

    // 画右半部分的竖线
    for (let x = this.config.midX; x <= this.config.width; x += this.config.grid) {
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, this.config.height);
    }
    this.app.stage.addChild(gridGraphics);
    this.graphicsObjects['grid'] = gridGraphics; // 使用一个键来标识这个网格对象


  }

  drawAxis() {
    if (!this.showAxis) {
      return
    }
    //创建坐标轴
    let axisGraphics = new PIXI.Graphics();
    axisGraphics.lineStyle(2, this.config.axisColor, 1);
    // x轴
    axisGraphics.moveTo(0, this.config.midY);
    axisGraphics.lineTo(this.config.width, this.config.midY);
    // y轴
    axisGraphics.moveTo(this.config.midX, 0);
    axisGraphics.lineTo(this.config.midX, this.config.height);
    this.app.stage.addChild(axisGraphics);
    this.graphicsObjects["axis"] = axisGraphics
  }


  private drawAxesNumber(): void {
    if (!this.showAxisNumber) {
      return
    }
    // 画坐标轴数字
    let textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: this.config.grid / 2.5,
      fill: this.config.textColor,
      align: 'center'
    });

    // X轴负方向的数字
    for (let i = -1; i >= this.config.startNum; i--) {
      let text = new PIXI.Text(i.toString(), textStyle);
      text.x = this.config.midX + i * this.config.grid;
      text.y = this.config.midY
      this.app.stage.addChild(text);
      this.textGraphicsObjects.push(text)
    }


    // X轴正方向的数字
    for (let i = 0; i <= this.config.endNum; i++) {
      let text = new PIXI.Text(i.toString(), textStyle);
      text.x = this.config.midX + i * this.config.grid;
      text.y = this.config.midY
      this.app.stage.addChild(text);
      this.textGraphicsObjects.push(text)
    }

    // Y轴负方向的数字
    for (let i = -1; i >= this.config.startY; i--) {
      let text = new PIXI.Text(i.toString(), textStyle);
      text.x = this.config.midX;
      text.y = this.config.midY - i * this.config.grid;
      this.app.stage.addChild(text);
      this.textGraphicsObjects.push(text)
    }

    // Y轴正方向的数字
    for (let i = 1; i <= this.config.endY; i++) {
      let text = new PIXI.Text(i.toString(), textStyle);
      text.x = this.config.midX;
      text.y = this.config.midY - i * this.config.grid;
      this.app.stage.addChild(text);
      this.textGraphicsObjects.push(text)
    }

    // 绘制y轴的全部数字（最左侧）
    // for (let i = this.config.startY; i < this.config.endY; i++) {
    //   if (i !== 0) {
    //     let text = new PIXI.Text(i.toString(), textStyle);
    //     text.x = i > 0 ? text.width * 2 : text.width * 1.2; // 设置为最左侧
    //     text.y = this.config.midY - i * this.config.grid;
    //     text.anchor.set(1, 0.5); // 调整文本的锚点以正确对齐
    //     this.app.stage.addChild(text);
    //     this.textGraphicsObjects.push(text);
    //   }
    // }

    // // 绘制x轴的全部数字（最上方）
    // for (let i = this.config.startNum + 1; i <= this.config.endNum; i++) {
    //   if (i !== 0) {
    //     let text = new PIXI.Text(i.toString(), textStyle);
    //     const offsetX = i > 0 ? text.width : text.width * 0.5
    //     text.x = this.config.midX + i * this.config.grid + offsetX;
    //     text.y = 20; // 设置为最上方
    //     text.anchor.set(0.5, 1); // 调整文本的锚点以正确对齐
    //     this.app.stage.addChild(text);
    //     this.textGraphicsObjects.push(text);
    //   }
    // }

  }

  drawAxesNumberTop() {
    if (!this.showAxisTopNumber) {
      return
    }
    // 画坐标轴数字
    let textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: this.config.grid / 2.5,
      fill: this.config.textColor,
      align: 'center'
    });
    // 绘制x轴的全部数字（最上方）
    for (let i = this.config.startNum + 1; i <= this.config.endNum; i++) {
      if (i !== 0) {
        let text = new PIXI.Text(i.toString(), textStyle);
        const offsetX = i > 0 ? text.width : text.width * 0.5
        text.x = this.config.midX + i * this.config.grid + offsetX;
        text.y = 20; // 设置为最上方
        text.anchor.set(0.5, 1); // 调整文本的锚点以正确对齐
        this.app.stage.addChild(text);
        this.topAxisGraphicsObjects.push(text);
      }
    }
  }

  drawAxesNumberLeft() {
    if (!this.showAxisLeftNumber) {
      return
    }
    // 画坐标轴数字
    let textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: this.config.grid / 2.5,
      fill: this.config.textColor,
      align: 'center'
    });

    // 绘制y轴的全部数字（最左侧）
    for (let i = this.config.startY; i < this.config.endY; i++) {
      if (i !== 0) {
        let text = new PIXI.Text(i.toString(), textStyle);
        text.x = i > 0 ? text.width * 2 : text.width * 1.2; // 设置为最左侧
        text.y = this.config.midY - i * this.config.grid;
        text.anchor.set(1, 0.5); // 调整文本的锚点以正确对齐
        this.app.stage.addChild(text);
        this.leftAxisGraphicsObjects.push(text);
      }
    }
  }



  drawCurve(fn: Function, start: number, end: number, currLineColor = "#00ff99"): void {
    // 画函数曲线
    const curveGraphics = new PIXI.Graphics();
    curveGraphics.lineStyle(this.config.curveLineWidth, currLineColor, 1);

    let firstPoint = true;

    for (let x = start; x <= end; x += this.config.step) {
      const y = fn(x);

      // 将函数返回的y值转换为画布上的y坐标
      const canvasX = this.config.midX + x * this.config.grid;
      const canvasY = this.config.midY - y * this.config.grid;

      if (firstPoint) {
        curveGraphics.moveTo(canvasX, canvasY);
        firstPoint = false;
      } else {
        curveGraphics.lineTo(canvasX, canvasY);
      }
    }

    this.app.stage.addChild(curveGraphics);
    this.fnGraphicsObjects.push(curveGraphics)
  }

  zoomIn() {
    if (this.config.grid > 40) {
      this.config.curveLineWidth = Math.round(this.config.grid / 40)
    } else if (this.config.grid <= 4) {
      alert("太小了，不能再小了呀")
      return
    }

    this.config.grid -= 1
    this.calculateAxisNumbers()
    this.reRender()
  }

  zoomOut() {
    this.config.grid += 1

    if (this.config.grid > 40) {
      this.config.curveLineWidth = 1 + Math.round(this.config.grid / 40)
    }

    this.calculateAxisNumbers()
    this.reRender()
  }

  axisTopLeft() {
    this.config.endNum = this.config.endNum + Math.abs(this.config.startNum)
    this.config.startNum = 0
    this.config.midX = this.config.grid
    this.reRender()
  }

  resetConf() {
    this.config.grid = this.confBak.grid
    this.config.curveLineWidth = this.confBak.curveLineWidth
    this.calculateAxisNumbers()
    this.reRender()
  }

  exportCanvasToImage() {
    // 获取想要转换的DOM元素
    const element = document.getElementById('contentArea');
    if (element) {
      // 使用html2canvas进行转换
      html2canvas(element).then(canvas => {
        // 创建一个Image元素
        const img = canvas.toDataURL('image/png');
        // 创建下载链接元素
        const downloadLink = document.createElement('a');
        downloadLink.href = img;
        const now = new Date();
        const formattedNow = now.toISOString().replace(/:/g, '-').slice(0, 19).replace('T', '-');
        downloadLink.download = `${formattedNow}.png`;
        // 触发下载
        downloadLink.click();
      }).catch(err => {
        console.error('导出图片出错', err);
      });
    } else {
      console.log("没有找到html")
    }
  }

  changeStyle(model = "dark") {
    if (this.config.colorStyle === "light") {
      this.config.colorStyle = "dark"
      this.config.background = this.config.darkColor.background
      this.config.gridColor = this.config.darkColor.gridColor
      this.config.axisColor = this.config.darkColor.axisColor
      this.config.textColor = this.config.darkColor.textColor
      //this.app.renderer.background = "#ff0000";
    } else {
      this.config.colorStyle = "light"
      this.config.background = this.config.lightColor.background
      this.config.gridColor = this.config.lightColor.gridColor
      this.config.textColor = this.config.lightColor.textColor
      this.config.axisColor = this.config.lightColor.axisColor
    }

    if (this.app) {
      this.app.destroy(true, {children: true, texture: true, baseTexture: true});
    }
    document.body.style.backgroundColor = this.config.lightColor.background;
    this.initPixiApp()
    this.reRender()
  }

  drawReact() {

  }

  drawCircle() {

  }

  setDrag() {
    this.config.dragAble = !this.config.dragAble;
    if (this.config.dragAble) {
      this.createDragArea()
    } else {
      this.app.stage.removeChild(this.graphicsObjects['dragReact']);
    }
  }

  setAxisIsShow() {
    this.showAxis = !this.showAxis
    if (this.showAxis) {
      this.drawAxis()
    } else {
      this.app.stage.removeChild(this.graphicsObjects["axis"]);
    }
  }

  setTopAxisIsShow(){
    this.showAxisTopNumber = !this.showAxisTopNumber
    if (this.showAxisTopNumber) {
      this.drawAxesNumberTop()
    } else {
      this.app.stage.removeChild(...this.topAxisGraphicsObjects);
    }
  }

  setLeftAxisIsShow(){
    this.showAxisLeftNumber = !this.showAxisLeftNumber
    if (this.showAxisLeftNumber) {
      this.drawAxesNumberLeft()
    } else {
      this.app.stage.removeChild(...this.leftAxisGraphicsObjects);
    }
  }

  setAxisIsShowNumber() {
    this.showAxisNumber = !this.showAxisNumber
    if (this.showAxisNumber) {
      // 移除坐标轴
      this.drawAxesNumber()
    } else {
      // 坐标轴数字重绘
      this.app.stage.removeChild(...this.textGraphicsObjects);
    }
  }

  setGridIsShow() {
    this.showGrid = !this.showGrid
    if (this.showGrid) {
      // 重绘网格
      this.drawGrid()
    } else {
      // 移除网格
      this.app.stage.removeChild(this.graphicsObjects['grid']);
    }
  }

  setCurveIsShow() {
    this.showCurve = !this.showCurve
    if (this.showCurve) {
      // 重绘函数曲线
      this.drawFn()
    } else {
      // 移除函数曲线
      this.cleanFn()
    }
  }


  cleanFn() {
    this.app.stage.removeChild(...this.fnGraphicsObjects);
  }

  drawFn() {
    if (!this.showCurve) {
      return
    }

    function fun1(x: number) {
      return Math.sin(x)
    }

    function fun2(x: number) {
      return x - Math.pow(2, Math.sin(3 * x))
    }

    function fun3(x: number) {
      return x * x * x / 2 + 6 * x * x - 5 * x - 6;
    }


    this.drawCurve(fun1, this.config.startNum, this.config.endNum)
    this.drawCurve(fun2, this.config.startNum, this.config.endNum, "#FFFF00")
    this.drawCurve(fun3, this.config.startNum, this.config.endNum, "#FF0000")
  }

}
