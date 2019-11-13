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
        this.rePassword = '';
        cc.sys.localStorage.clear();
        // cc.sys.localStorage.setItem('accounts', JSON.stringify({}));
    },

    inputAccounteEnded: function(editbox, customEventData) {
        this.account = editbox.string;
    },

    inputPasswordEnded: function(editbox, customEventData) {
        this.password = editbox.string;
    },

    reInputPasswordEnded: function(editbox, customEventData) {
        this.rePassword = editbox.string;
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

    onRegister: function() {
        //var accountReg = /(^[\d\w]+)/;
        var accountReg = /(^[0-9a-zA-Z_]{1,}$)/;
        
        if (!this.account || this.account.length<3) {
            this._showErrorHint('请输入3位以上用户名！');
            return;
        }
        if (!accountReg.test(this.account)) {
            this._showErrorHint('用户名只能使用英文、数字和下划线！');
            return;
        }
    
        if (!this.password || this.password.length<6) {
            this._showErrorHint('请输入6位以上密码！');
            return;
        }
    
        if (this.password != this.rePassword) {
            this._showErrorHint('两次输入密码不一致！');
            return;
        }
        // cc.log("account=", this.account, "password=", this.password, "rePassword=", this.rePassword);
        this._startRegister();
    },

    onLogin: function() {
        cc.director.loadScene("Login");
    },

    _startRegister: function() {
        //cc.log("step_0", "account=", this.account, "password=", this.password, "rePassword=", this.rePassword);
        //var accounts = JSON.parse(cc.sys.localStorage.getItem('accounts'));
        //cc.log("step_1", "account=", this.account, "password=", this.password, "rePassword=", this.rePassword);
        if (cc.sys.localStorage.getItem(this.account)) {
            this._showErrorHint('用户名已经被注册！');
            return;
        }
        var accountData = {
            user: this.account,
            password: this.password,
            easyRecord: 99*3600*1000,
            mediumRecord: 99*3600*1000,
            hardRecord: 99*3600*1000,
            extremeRecord: 99*3600*1000,
        }
        // window.Global.accountData = accountData;
        // accounts[this.account] = accountData;
        cc.sys.localStorage.setItem(this.account, JSON.stringify(accountData));
        cc.director.loadScene("Login");
    }
    
});
