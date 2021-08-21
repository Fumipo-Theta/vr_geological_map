(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["../../three.js-master/build/three.min"], factory);
  } else if (typeof exports === "object") {
    module.exports = factory();
  } else {
    root.Camera = factory(root.THREE);
  }
})(this, function (_Three) {

  const Three = (typeof require === 'undefined' && typeof _Three === 'object') ?
    _Three
    : require("../../three.js-master/build/three.min");


  const Camera = cameraType => (fov, near, far, w, h, aspectFunc) => {
    let camera = new cameraType(fov, aspectFunc(w, h), near, far);
    camera.up.set(0, 1, 0);

    return camera
  }

  const PerspectiveCamera = Camera(Three.PerspectiveCamera);

  /** setCameraController
   * UI状態を反映したカメラコントローラーを返す
   * 
   * uiState.cameraModeを参照
   * 
   * @param {Object} uiState
   * @param {THREE.Camera} camera
   * @return {THREE.Controller} 
   */
  const setController = uiState => (camera, dom) => {

    let ctrl;
    switch (uiState.cameraMode) {
      // 三人称視点
      case "TPS":
        ctrl = new Three.OrbitControls(camera, dom);
        ctrl.autoRotate = false;
        ctrl.minDistance = 30;
        ctrl.maxDistance = 1000;
        // 上下の振り幅
        ctrl.minPolarAngle = 0;
        ctrl.maxPolarAngle = Math.PI / 2;
        // lookAt()の代わり
        ctrl.target = new Three.Vector3(0, 0, 0);

        break;

      // 一人称視点
      case "FPS":
        ctrl = new Three.FirstPersonControls(camera, dom);
        ctrl.lookSpeed = 0.2;
        ctrl.movementSpeed = 5;
        ctrl.noFly = true;
        ctrl.lookVertical = true; // false : 首を上下に振れない
        ctrl.autoForward = false;
        ctrl.activeLook = true; // false : 一方向しか見られない
        // 首を上下する角度
        ctrl.constrainVertical = true;
        ctrl.verticalMin = 1.0;
        ctrl.verticalMax = 2.0;
        // カメラの初期方向
        ctrl.lon = 0;
        ctrl.lat = 0;
        break;

      default:

        break;
    }
    return ctrl;
  }


  return {
    Camera,
    PerspectiveCamera,
    setController
  };
});
