cc.Class({
    extends: cc.Component,
//文字事件触发脚本，应用在hintpanel中点击走下角和右下角的文字出发相应的事件
    properties: {
        // foo: {
        //    default: null,      // The default value will be used only when the component attaching
        //                           to a node for the first time
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
    },
//点击相应的text触发一个事件
    onHintCancel:function () {
        this.node.dispatchEvent( new cc.Event.EventCustom('HintCancel', true) );//取消
    },

    onHintNext:function () {
        this.node.dispatchEvent( new cc.Event.EventCustom('HintNext', true) );//下一步
    },

    onHintPrevious:function () {
        this.node.dispatchEvent( new cc.Event.EventCustom('HintPrevious', true) );//上一步
    },

    onHintApply:function () {
        this.node.dispatchEvent( new cc.Event.EventCustom('HintApply', true) );//确定
    }
    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
