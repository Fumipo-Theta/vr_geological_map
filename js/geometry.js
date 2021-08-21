/** Geometry
 * コンター群を受け取ってgeometryを作成し返す関数
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Geometry = factory(root.THREE);
  }
}(this, function (_Three) {

  const THREE = (typeof require === 'undefined' && typeof _Three === 'object') ?
    _Three
    : require("../../three.js-master/build/three.min");


  class TransformPlane {
    constructor(w, h, segX, segY) {
      this.width = w;
      this.height = h;
      this.segX = segX;
      this.segY = segY;
      this.material;
      this.plane;
      return this;
    }

    return(_) {
      return this.plane;
    }

    createPlane(_) {
      this.plane = new THREE.Mesh(
        new THREE.PlaneGeometry(this.width, this.height, this.segX, this.segY),
        this.material
      );

      this.plane.rotation.x = - Math.PI / 2; // x-z平面に平行にする
      return this;
    }

    setMaterial(materialFunc) {
      this.material = materialFunc();
      return this;
    }

    // f :: vertex[Num,Num,Num] -> vertex[Num,Num,Num]
    // vertices -> i -> j -> vertices
    map(f) {
      this.plane.geometry.verticesNeedUpdate = true
      for (let i = 0, nx = this.segX; i < nx + 1; i++) {
        for (let j = 0, ny = this.segY; j < ny + 1; j++) {
          //(i,j)のvertexを得る
          let index = j * (nx + 1) + i % (ny + 1);
          let vertices = this.plane.geometry.vertices;
          let vertex = vertices[index]
          let newVertex = f(vertex, i, j, index, TransformPlane.vertices2d(vertices));
          vertex.x = newVertex.x;
          vertex.y = newVertex.y;
          vertex.z = newVertex.z;
        }
      }
    }

    static vertices2d(vertices, nx, ny) {
      return (i, j) => vertices[j * (nx + 1) + i % (ny + 1)]
    }

  }

  const Geometry = {
    fromContour: contour => {

    },

    fromPoints: points => {

    },

    fromPreset: response => {

    },

    fromHeightMap: (wx, wy) => {


      const plane = new TransformPlane(wx, wy, 31, 31);
      plane.setMaterial(_ => {
        const texture = THREE.ImageUtils.loadTexture('images/heightmap2.png');
        return new THREE.MeshLambertMaterial({ map: texture })
      })
        .createPlane()

      return plane;
    },

    testData: (wx, wy) => {
      const plane = new TransformPlane(wx, wy, 63, 63);
      plane.setMaterial(_ => new THREE.MeshLambertMaterial({
        color: 0x444444, //球の色
        wireframe: true //ワイヤーフレーム有効
      }))
        .createPlane();

      return plane;
    },

    transformByHeightMap: (canvasId, _scale) => {
      const scale = (_scale == undefined) ? 1 : _scale;
      const canvas = document.getElementById(canvasId);
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const size = w * h;
      const data = new Float32Array(size);

      for (let i = 0; i < size; i++) {
        data[i] = 0;
      }
      const imgd = ctx.getImageData(0, 0, w, h);
      const pix = imgd.data;
      let j = 0;
      for (let i = 0; i < pix.length; i += 4) {
        let all = pix[i] + pix[i + 1] + pix[i + 2];
        data[j++] = all / 12 * scale * 0.5;
      }



      return (v, x, y, i, a) => {
        return {
          x: v.x,
          y: v.y,
          z: data[i]
        }
      }

    }

  };

  return Geometry;
}))