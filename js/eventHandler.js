/** User interface操作の変化を見張り, イベントに応じてアプリケーションの状態を変化させる.
 * アプリケーションの状態はただ一つのオブジェクト(uiState)が保持しているものとする.
 * アプリケーションはループの中で状態を参照しており, 状態の変化によって動作を変更するものとする.
 * 状態変化の検出と通知をPublisher-Subscriberパターンによって実装している.
 * 
 * DOMイベントに対するコールバックとして,PublisherがSubscriberに通知を行う.
 * すると,Subscriberは予め登録された処理によってアプリケーションの状態を更新する.
 * 
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.setUIEventHandler = factory(root.PubSub, root.Scene);
  }
}(this, function (_PubSub, _Scene) {

  const PubSub = (typeof require === 'undefined' && typeof _PubSub === 'object') ?
    _PubSub
    : require("../../jslib/pub_sub");
  const { Publisher, Subscriber } = PubSub;

  const Scene = (typeof require === 'undefined' && typeof _Scene === 'function') ?
    _Scene
    : require("sceneHandler");


  const setUIEventHandler = function (uiState) {
    // Subscriberの作成と,通知に対する処理を定義する
    const subscriber = new Subscriber()
      .subscribe("startLoop", /* レンダーループの開始 */
        function () {
          if (uiState.stopLoop) {
            console.log("loop started");
            uiState.stopLoop = false;
          }
        }
      )
      .subscribe("stopLoop",/* レンダーループの停止 */
        function () {
          console.log("loop stopped")
          uiState.stopLoop = true;
        }

      )
      .subscribe("switchFPS",
        function () {
          console.log("FPS")
          uiState.cameraMode = "FPS";
          uiState.cameraChanged = true;
        }
      )
      .subscribe("switchTPS",
        function () {
          console.log("TPS")
          uiState.cameraMode = "TPS";
          uiState.cameraChanged = true;
        }
      )

    const publisher = new Publisher()
      .register(subscriber)

    document.getElementById("button_to_start").addEventListener("click",
      ev => publisher.publish("startLoop"),
      false
    )
    document.getElementById("button_to_stop").addEventListener("click",
      ev => publisher.publish("stopLoop"),
      false
    )
    document.getElementById("button_to_fps").addEventListener("click",
      ev => publisher.publish("switchFPS"),
      false
    )
    document.getElementById("button_to_tps").addEventListener("click",
      ev => publisher.publish("switchTPS"),
      false
    )
  }




  return setUIEventHandler;
}))