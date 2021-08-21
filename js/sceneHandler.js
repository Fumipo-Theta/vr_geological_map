(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([
      "../../three.js-master/build/three.min",
      "camera"
    ], factory);
  } else if (typeof exports === "object") {
    module.exports = factory();
  } else {
    root.Scene = factory(
      root.THREE,
      root.Camera,
      root.Geometry
    );
  }
})(this, function (_Three, _Camera, _Geometry) {

  const Three = (typeof require === 'undefined' && typeof _Three === 'object') ?
    _Three
    : require("../../three.js-master/build/three.min");


  const Camera = (typeof require === 'undefined' && typeof _Camera === 'object') ?
    _Camera
    : require("camera");

  const Geometry = (typeof require === 'undefined' && typeof _Geometry === 'object') ?
    _Geometry
    : require("geometry");



  const startTime = new Date();

  const Scene = function (uiState) {

    const scene = new Three.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // 背景色
    const clock = new Three.Clock();

    // initial camera setting
    const view = uiState.cameraSetting;

    /** camera作成
     * 
     */
    let camera = Camera.PerspectiveCamera(view.fov, view.near, view.far, view.width, view.height, (w, h) => w / h);


    /** camera controller設定
     * 
     */
    let cameraController = Camera.setController(uiState)(camera, uiState.canvas_3d);



    /** 光源設定
     * 
     */
    let directionalLight = new Three.DirectionalLight(0xffffff);
    directionalLight.position.set(0, 0.7, 0.7);
    let ambientLight = new Three.AmbientLight(0x888888);


    // テスト用キューブ
    const testCube = (function () {
      let geometry = new Three.CubeGeometry(30, 30, 30);
      let material = new Three.MeshPhongMaterial({ color: 0xff0000 });
      return new Three.Mesh(geometry, material);
    })()
    testCube.position.set(0, 0, 0);

    // テスト用平面
    //const grid = new THREE.GridHelper(1000, 20); // size, step
    //grid.rotation.x = - Math.PI / 2;
    //scene.add(grid)

    // テスト用地形面
    const surface = Geometry.testData(1000, 1000);
    //surface.return().position.set(0, 10, 0);
    scene.add(surface.return());

    //XYZ軸の表示（長さ）
    const axis = new THREE.AxisHelper(1000);
    scene.add(axis);
    axis.position.set(0, 0, 1);

    /** レンダー設定
     * 表示領域設定(setSize)
     */
    const renderer = new Three.WebGLRenderer({
      canvas: uiState.canvas_3d
    });
    renderer.setSize(view.width, view.height);
    //document.body.appendChild(renderer.domElement);

    /** camera視点の初期設定
     * 
     */
    camera.position.set(1000, 1000, 1000);
    cameraController.update()
    scene.add(directionalLight);
    scene.add(ambientLight);
    scene.add(testCube);
    renderer.render(scene, camera);


    /** tick
     * 表示内容を更新するループを開始する関数
     */
    const tick = function renderLoop() {
      let time = (new Date() - startTime) / 1000;
      let delta = clock.getDelta();
      if (!uiState.stopLoop) {
        /** シーン更新
         * 
        */
        testCube.rotation.set(
          0,
          testCube.rotation.y + 0.01,
          testCube.rotation.z + 0.01
        )

        //surface.map(wave(time));

      }


      if (uiState.editor.heightMap.changed) {
        surface.map(Geometry.transformByHeightMap(
          uiState.editor.heightMap.id,
          uiState.editor.heightMap.scale
        ))
        uiState.editor.heightMap.changed = false;
      }

      /** カメラコントローラー更新
       * 
       */

      if (uiState.cameraChanged) {
        cameraController.dispose();
        cameraController = Camera.setController(uiState)(camera, uiState.canvas_3d)
        uiState.cameraChanged = false;
      }
      cameraController.update(delta);

      /** レンダリングを更新
       * 
       */
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    };

    return tick
  };

  return Scene;
});

function wave(t) {
  return (v, x, y, i, a) => {
    const amp = 10;
    return {
      x: v.x,
      y: v.y,
      z: amp * Math.sin(-(x + y) / 2 + t * 10) + amp * Math.sin(-(x + y) / 2 - t * 11)
    }
  }
}