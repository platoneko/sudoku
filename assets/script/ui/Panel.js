cc.Class({
    extends: cc.Component,
//所有按键盘以及它们按键的接口集合脚本文件
    properties: {
        numsPanel:cc.Node,//创建数字键盘节点接口
        editPanel:cc.Node,//创建编辑键盘节点接口
        nums:[cc.Button],//开辟一个节点数组，放1~9号按钮
        editButton:cc.Button,//创建草稿纸编辑节点接口
        clearButton:cc.Button//创建清除节点接口
    },

    // use this for initialization
    onLoad: function () {

    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
