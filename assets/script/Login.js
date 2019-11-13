cc.Class({
    extends: cc.Component,

    properties: {
        errorHintLabel: {
            default: null,
            type: cc.Label
        },
    },

    onLoad: function () {
        this.account = '';
        this.password = '';
        // cc.sys.localStorage.clear();
        // cc.sys.localStorage.setItem('accounts', JSON.stringify(new Array()));
    },

    inputAccounteEnded: function(editbox, customEventData) {
        this.account = editbox.string;
    },

    inputPasswordEnded: function(editbox, customEventData) {
        this.password = editbox.string;
    },

    _showErrorHint: function(msg) {
    
        // 显示提示
        this.errorHintLabel.string = msg;
        this.errorHintLabel.node.active = true;
        
        // 设置计时器
        this.scheduleOnce(function(){
            this.errorHintLabel.node.active = false;
        }.bind(this), 2);
    },

    onLogin: function() {
        if (!this.account) {
            this._showErrorHint('用户名不能为空！');
            return;
        }
        if (!this.password) {
            this._showErrorHint('密码不能为空！');
            return;
        }
        this._startLogin();
    },

    onRegister: function() {
        cc.director.loadScene("Register");
    },

    _startLogin: function() {
        // var accounts = JSON.parse(cc.sys.localStorage.getItem('accounts'));
        if (!cc.sys.localStorage.getItem(this.account)) {
            this._showErrorHint('用户名不存在！');
            return;
        }
        var accountData = JSON.parse(cc.sys.localStorage.getItem(this.account));
        if (accountData['password'] != this.password) {
            this._showErrorHint('密码错误！');
            return;
        }
        
        window.Global.accountData = accountData;
        // cc.log("account=", this.account, "password=", this.password, "rePassword=", this.rePassword);
        cc.director.loadScene("Start");
    }
    
});
