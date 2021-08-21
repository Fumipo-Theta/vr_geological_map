(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.SplineEditor = factory(root.d3, root.funcTools);
  }
}(this, function (_d3, _funcTools) {

  const d3 = (typeof require === 'undefined' && typeof _d3 === 'object') ?
    _d3
    : require("../../jslib/d3.v4.min");

  const funcTools = (typeof require === 'undefined' && typeof _funcTools === 'object') ?
    _funcTools
    : require("../../jslib/funcTools");

  const zip = funcTools.zip;

  class EditorSet {
    constructor() {
      this.counter = 0;
      this.active = 0;
      this.idx = [];
      this.height = [];
      this.spline = [];
      this.controller = []

    }

    init(state) {
      const w = state.editor.canvas.width;
      const h = state.editor.canvas.height;
      this.heightMap = d3.select("body").append("canvas")
        .attr("id", "heightMap")
        .attr("class", "hiddenCanvas")
        .attr("width", 64)
        .attr("height", 64)
    }

    addSpline(state) {
      const count = this.active = this.count()
      this.idx.push(count);
      this.state = state;
      const height = (this.height.length == 0) ? state.editor.contour_interval.value
        : Math.max(...this.height) + state.editor.contour_interval.value;

      this.height.push(height)
      this.color = this.colorScale(0, this.height);

      this.spline.push(new Spline(count, state));
      this.controller.push(new SplineController(count, height, state));
      this.redraw();
    }

    createHeightMap(state) {
      const filled = [].slice.call(document.querySelectorAll(".fill"));
      if (filled.length == 0) return
      const cv = this.heightMap.node();
      const w = cv.width;
      const h = cv.height;

      // 全てのfilled canvasを重ね合わせて統合する
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "black";
      ctx.rect(0, 0, w, h);
      ctx.fill();
      filled.forEach(canvas => {
        ctx.drawImage(canvas, 0, 0, w, h);
      })

      //const dst = ctx.getImageData(0, 0, w, h)
      bilateralFilter(cv, ctx, 16, 255);


      // stateの更新
      state.editor.heightMap.changed = true;
      state.editor.heightMap.scale = (Math.max(...this.height) - Math.min(...this.height, 0)) / state.editor.contour_interval.value;
      alert("Height map created")
    }

    redraw() {
      for (let i = 0, l = this.idx.length; i < l; i++) {
        this.spline[i].setColor(this.color(this.height[i]))
        this.spline[i].drawCanvas();
      }
    }

    setActiveId(id) {
      this.active = id;
      this.redraw();
    }

    setHeight(h, id) {
      const idx = this.idx.indexOf(id);
      this.height[idx] = h;
      this.color = this.colorScale(0, this.height);
      this.sortByHeight();
      this.redraw();
    }

    sortByHeight() {
      const wrapper = document.querySelector(`#${this.state.editor.canvas.wrapperId}`)
      const pathCanvas = wrapper.querySelector(".path")
      zip(this.height)(this.idx)
        .sort((a, b) => (a[0] < b[0]) ? -1 : 1)
        .forEach(v => {
          const canvas = document.querySelector(`#filled_${this.state.editor.canvas.idPrefix}${v[1]}`)
          wrapper.insertBefore(wrapper.removeChild(canvas), pathCanvas)
        })
    }

    colorScale(l, h) {
      const maxHeight = Math.max(...h);
      const minHeight = Math.min(...h, 0);
      const scale = d3.scaleSequential(d3.interpolateGreys)
        .domain([maxHeight, minHeight])
      //d3.scaleSequential(d3.schemeGreys)
      //.domain([0, maxHeight]);

      //kokonaosu
      return height => scale(height);
    }

    delete(id) {
      const idx = this.idx.indexOf(id);
      this.spline[idx].remove();
      this.controller[idx].remove();
      this.idx.splice(idx, 1);
      this.height.splice(idx, 1);
      this.spline.splice(idx, 1);
      this.controller.splice(idx, 1);
      this.color = this.colorScale(0, this.height);
      this.redraw();
    }

    count() {
      return this.counter++
    }
  }

  var colourToNode = {};

  const editorSet = new EditorSet();


  class SplineController {
    constructor(identifier, height, state) {
      this.canvasWrapper = state.editor.canvas.wrapperId;
      this.canvasId = `${state.editor.canvas.idPrefix}${identifier}`;
      this.identifier = identifier;

      this.div = d3.select("#" + state.editor.controller.wrapperId).insert("div", ':first-child')
        .attr("id", `${state.editor.controller.idPrefix}${identifier}`)
        .attr("class", "layer_controller")

      this.height = this.div.append("input")
        .attr("type", "number")
        .attr("value", height)
        .on("change", v => {
          this.changeHeight();
        })


      this.editBtn = this.div.append("div")
        .attr("class", "editor_button edit_layer")
        .text("edit")
        .on("click", ev => {
          this.liftCanvasTop();
          this.activate(this);
        })
      this.deleteBtn = this.div.append("div")
        .attr("class", "editor_button delete_layer")
        .text("delete")
        .on("click", ev => {
          editorSet.delete(this.identifier);
        })

      this.activate(this);
    }

    getHeight() {
      return this.height.node().valueAsNumber;
    }

    changeHeight() {
      editorSet.setHeight(this.getHeight(), this.identifier);
    }

    liftCanvasTop() {
      const canvasWrapper = document.querySelector(`#${this.canvasWrapper}`)
      const canvas = canvasWrapper.querySelectorAll(".path");
      const thisCanvas = document.querySelector(`#${this.canvasId}`)
      const canvasArray = Array.prototype.slice.call(canvas);
      canvasArray.sort((a, b) => (a == thisCanvas) ? 1 : -1);
      canvasArray.map((a, i) => {
        canvasWrapper.appendChild(canvasWrapper.removeChild(a))
      })
    }

    activate(self) {
      d3.selectAll(".layer_controller")
        .each(function (d) {
          d3.select(this)
            .classed("active", false);
        })
      self.div.classed("active", true)
      editorSet.setActiveId(self.identifier);
    }

    remove() {
      this.div.remove();
    }
  }



  class Spline {
    constructor(identifier, state) {
      const self = this;
      this.identifier = identifier;
      const canvasId = `${state.editor.canvas.idPrefix}${identifier}`

      const width = this.width = state.editor.canvas.width;
      const height = this.height = state.editor.canvas.height;
      this.dragged = null;
      this.selected = null;

      this.canvas = d3.select("#" + state.editor.canvas.wrapperId)
        .append("canvas")
        .attr("id", canvasId)
        .attr("class", "editor_layer path")
        .attr("width", width)
        .attr("height", height)
        .on("mousedown", this.mousedown.bind(this));

      this.filledCanvas = d3.select("#" + state.editor.canvas.wrapperId)
        .insert("canvas", ".path")
        .attr("id", "filled_" + canvasId)
        .attr("class", "editor_layer fill")
        .attr("width", width)
        .attr("height", height)



      this.hiddenCanvas = d3.select("body")
        .append('canvas')
        .attr("id", `hidden_${canvasId}`)
        .attr("class", `hiddenCanvas`)
        .attr('width', width)
        .attr('height', height);

      this.context = this.canvas.node().getContext("2d");
      this.filledContext = this.filledCanvas.node().getContext("2d");
      this.hiddenContext = this.hiddenCanvas.node().getContext("2d");

      // 曲線の種類を設定
      this.line = ctx => d3.line()
        .curve(d3.curveCatmullRomClosed)
        .context(ctx)

      this.points = [];


      // 専用のイベントループタイマーを準備し, 一時停止しておく(GPUに余計な負荷をかけないため)
      this.timer = d3.timer(self.drawCanvas.bind(self));
      this.timer.stop()

      d3.select(`#${canvasId}`)
        .on("mousemove", this.mousemove.bind(this))
        .on("mouseup", this.mouseup.bind(this))
        .on("mouseover", ev => {

          d3.select(window)
            .on("keydown", self.keydown.bind(self));
          // マウスオーバー時にイベントループが再開するようにする
          this.timer.restart(self.drawCanvas.bind(self))
        })
        .on("mouseout", ev => {
          d3.select(window)
            .on("keydown", ev => null);
          // マウスが外れるとイベントループを停止する
          this.timer.stop()
        })


      this.detachedContainer = d3.select("body").append("custom")
        .attr("id", `custom_${identifier}`);
      this.dataContainer = d3.select(`#custom_${identifier}`);
    }

    remove() {
      this.canvas.remove();
      this.filledCanvas.remove();
      this.hiddenCanvas.remove();
      this.dataContainer.remove();
    }

    setColor(c) {
      this.color = c;
    }

    // パスを閉じるため始点と同じ座標を終点に追加
    closed() {
      let a = this.points.map(v => v);
      if (this.points.length > 1) a[this.points.length] = this.points[0];
      return a;
    }

    redraw() {
      const self = this;
      const circle = this.dataContainer.selectAll("custom.circle")
        .data(this.points, function (d) { return d; });

      circle.enter().append("custom")
        .classed("circle", true)
        .attr("r", 1e-6)
        .attr("cx", function (d) { return d[0]; })
        .attr("cy", function (d) { return d[1]; })
        .attr("r", 6.5)
        .attr('fillStyleHidden', function (d) {
          var newColor = genColor();
          colourToNode[newColor] = this;
          return newColor;
        });

      circle
        .classed("selected", function (d) { return d === self.selected; })
        .attr("cx", function (d) { return d[0]; })
        .attr("cy", function (d) { return d[1]; });

      circle.exit().remove();

      if (d3.event) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    drawPath(ctx, color) {
      ctx.beginPath();
      ctx.lineWidth = 1.5;

      ctx.strokeStyle = color;
      // 点をもとに曲線を描く
      this.line(ctx)(this.points);
      ctx.stroke();
    }

    fillPath(ctx, color) {
      ctx.beginPath();
      ctx.fillStyle = color;
      // 点をもとに曲線を描く
      this.line(ctx)(this.points);
      ctx.fill();
    }

    drawCanvas() {
      const id = this.identifier;
      const context = this.context;
      const filledContext = this.filledContext;
      const hiddenContext = this.hiddenContext;
      const canvas = this.canvas;
      const filledCanvas = this.filledCanvas;
      const hiddenCanvas = this.hiddenCanvas;
      const color = this.color;

      // リフレッシュ
      context.clearRect(0, 0, canvas.attr("width"), canvas.attr("height"));
      filledContext.clearRect(0, 0, filledCanvas.attr("width"), filledCanvas.attr("height"));
      hiddenContext.clearRect(0, 0, hiddenCanvas.attr("width"), hiddenCanvas.attr("height"));

      // パスを引き,フィル
      this.drawPath(
        context,
        (editorSet.active == this.identifier) ?
          "#2196f3" :
          color
      )

      this.fillPath(
        filledContext,
        color
      )

      // hidden contextにパスを引く
      hiddenContext.beginPath();
      hiddenContext.lineWidth = 10;
      hiddenContext.strokeStyle = "black";
      // 点をもとに曲線を描く
      this.line(hiddenContext)(this.points);
      hiddenContext.stroke();

      // データコンテナからcircleを取り出し,contextに描く

      var elements = this.dataContainer.selectAll("custom.circle");
      elements.each(function (d) {

        //circleごとにcanvas上に円を描く
        var node = d3.select(this);


        context.beginPath();
        context.arc(node.attr("cx"), node.attr("cy"), 4, 0, 2 * Math.PI, false);
        context.lineWidth = 2.5;

        if (!node.classed("selected")) {
          // 選択中でない
          context.strokeStyle = (editorSet.active == id) ? "rgba(10,127,250,0.5)" : color;
          context.stroke();
        } else {
          // 選択中: アクティブか
          context.fillStyle = (editorSet.active == id) ? "rgba(255,127,14,0.2)" : "rgba(255,127,14,0)";
          context.fill();
          context.strokeStyle = (editorSet.active == id) ? "rgba(255,127,14,0.7)" : color;
          context.stroke();
        }


        hiddenContext.beginPath();
        hiddenContext.arc(node.attr("cx"), node.attr("cy"), 10, 0, 2 * Math.PI, false);
        hiddenContext.lineWidth = 1.5;
        hiddenContext.strokeStyle = node.attr("fillStyleHidden");
        hiddenContext.fillStyle = node.attr("fillStyleHidden");
        hiddenContext.fill();
        hiddenContext.stroke();
      });


    }

    mouseup() {
      if (!this.dragged) return;
      this.mousemove.bind(this)();
      this.dragged = null;
    }

    keydown() {
      if (!this.selected) return;
      switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: { // delete
          var i = this.points.indexOf(this.selected);
          this.points.splice(i, 1);
          this.selected = this.points.length ? this.points[i > 0 ? i - 1 : 0] : null;
          this.redraw();
          break;
        }
      }
    }


    /**
     * hidden canvasにはrgbで打点してある.
     * 点はrgb(0,0,0)から始まって, 一点ごとにr,g,b値が255進数で1づつ変わるようになっている.
     * hidden canvas上にマウス座標をマッピングし, ピクセル色が白なら点を追加する.
     * 白でなければ,rgb値からどの点であるかを判断し, 対応する点をselectedにする.
    */
    mousedown() {
      var mousePos = d3.mouse(this.canvas.node());
      var col = this.hiddenContext.getImageData(mousePos[0], mousePos[1], 1, 1).data;

      var colKey = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
      var alpha = col[3];

      if (alpha == 0) {
        // alphaチャネル0なら制御点でも曲線でもないので点を追加
        this.points.push(this.selected = this.dragged = d3.mouse(this.canvas.node()));

      } else if (colKey == "rgb(0,0,0)") {
        // 黒なら曲線上なので制御点間に点を追加
        var newNode = this.selected = this.dragged = d3.mouse(this.canvas.node());
        var idx = 0, prevDistance = Infinity;
        for (let i = 0, l = this.points.length; i < l; i++) {
          let m = this.points[i];
          let n = (i == l - 1) ? this.points[0] : this.points[i + 1];
          let dist = Math.sqrt((newNode[0] - m[0]) ** 2 + (newNode[1] - m[1]) ** 2) +
            Math.sqrt((newNode[0] - n[0]) ** 2 + (newNode[1] - n[1]) ** 2) - Math.sqrt((m[0] - n[0]) ** 2 + (m[1] - n[1]) ** 2)
          // 3点の並びが最も直線に近い時, 新しい点が隣り合う2点の間にあると判定する
          if (dist < prevDistance) {
            idx = i + 1;
            prevDistance = dist;
          }
        }

        var tmp = this.points.slice(0, idx);
        tmp.push(newNode);
        this.points = tmp.concat(this.points.slice(idx));
      } else {
        // 黒でなければ既存の制御点なので制御点編集モードに
        var nodeData = d3.select(colourToNode[colKey]);
        this.selected = this.dragged = nodeData.datum();
      }
      this.redraw();

    }

    mousemove() {
      if (!this.dragged) return;
      var m = d3.mouse(this.canvas.node());
      this.dragged[0] = Math.max(0, Math.min(this.width, m[0]));
      this.dragged[1] = Math.max(0, Math.min(this.height, m[1]));
      this.redraw();
    }
  }










  /*
    var t = d3.timer(function(elapsed) {
          if (elapsed > 1000) t.stop();
          drawCanvas();
      });*/



  //https://medium.freecodecamp.org/d3-and-canvas-in-3-steps-8505c8b27444
  // 呼ばれるたびにrgb値が1異なるカラーコードを返す.
  var nextCol = 2;
  function genColor() {

    var ret = [];
    if (nextCol < 16777215) {

      ret.push(nextCol & 0xff); // R 
      ret.push((nextCol & 0xff00) >> 8); // G 
      ret.push((nextCol & 0xff0000) >> 16); // B
      nextCol += 2;

    }
    var col = "rgb(" + ret.join(',') + ")";
    return col;
  }


  /** wavelet transformation を用いて画像に low pass filteringを施す
   * FFTではGibbs効果で擬色が発生する場合がある.
   * 
   * @param {canvas element} cv 
   * @param {Context of canvas} ctx 
   */
  function lowPassFilterByWavelet(cv, ctx) {

  }

  function bilateralFilter(cv, ctx, radius, threshold) {
    var iW = cv.width,
      iH = cv.height,
      img = ctx.getImageData(0, 0, iW, iH),
      // http://www.wolframalpha.com/input/?i=solve+x+for+erf%28x%29+%3D+255%2F256
      sigma8bit = 2.04045;
    // ensure they are numbers or something totally unexpected happens
    radius *= 1;
    threshold *= 1;
    // don't forget to add margin
    var cW = cv.width = iW + radius * 2,
      cH = cv.height = iH + radius * 2;

    ctx.putImageData(img, radius, radius);
    // init spaceWeight
    var spaceWeight = {},
      sigmaSpace = radius / sigma8bit, // erf^-1(1-1/256)
      gaussSpaceCoeff = -0.5 / (sigmaSpace * sigmaSpace);
    for (var i = 0; i <= radius; i++) {
      for (var j = 0; j <= radius; j++) {
        var r2 = i * i + j * j;
        spaceWeight[r2] = spaceWeight[r2] || Math.exp(r2 * gaussSpaceCoeff);
      }
    }
    // table lookup is unused for color space
    var sigmaColor = threshold / 255 * Math.sqrt(255 * 255 * 3) / sigma8bit,
      gaussColorCoeff = -0.5 / (sigmaColor * sigmaColor);
    // Let's do it!
    var src = ctx.getImageData(0, 0, cW, cH),
      dst = ctx.getImageData(0, 0, cW, cH),
      srcD = src.data,
      dstD = dst.data,
      abs = Math.abs;
    for (var x = radius; x < cW - radius; ++x) { // each pixel
      for (var y = radius; y < cH - radius; ++y) {
        var sumB = 0,
          sumG = 0,
          sumR = 0,
          sumW = 0,
          m = (y * cv.width + x) * 4,
          r0 = srcD[m],
          g0 = srcD[m + 1],
          b0 = srcD[m + 2];
        for (var k = -radius; k <= radius; ++k) { // each kernel
          for (var l = -radius; l <= radius; ++l) {
            var n = ((y + l) * cW + (x + k)) * 4,
              r = srcD[n],
              g = srcD[n + 1],
              b = srcD[n + 2],
              dr = r - r0,
              dg = g - g0,
              db = b - b0,
              dc = dr * dr + dg * dg + db * db,
              ds = k * k + l * l;
            // el corazon
            var w = spaceWeight[ds] * Math.exp(dc * gaussColorCoeff);
            sumW += w;
            sumR += r * w;
            sumG += g * w;
            sumB += b * w;
          }
        }
        dstD[m] = sumR / sumW;
        dstD[m + 1] = sumG / sumW;
        dstD[m + 2] = sumB / sumW;
        dstD[m + 3] = srcD[m + 3];
      }
    }
    // now remove the margins
    ctx.putImageData(dst, 0, 0);
    dst = ctx.getImageData(radius, radius, iW, iH);
    cv.width = iW;
    cv.height = iH;
    ctx.putImageData(dst, 0, 0);
    //return cv.toDataURL('img/png');
  }


  return editorSet;
}))