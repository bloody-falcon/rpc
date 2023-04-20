const {
    HandleRPCFunction
} = require('../response');

const RPC_SUBSCRIBE_FUNCTION_HELPER = {
    subscribeList: {},
    /**
     * @setSubscribeList
     * @public
     * @param _param object - key => action
     */
    setSubscribeList(_param) {
        let _subscribeList = {};
        for (let key in _param) {
            let action = _param[key];
            _subscribeList[key] = async(data) => {
                return HandleRPCFunction(action, data, key);
            };
        }
        this.subscribeList = _subscribeList;
        return _subscribeList;
    }
};

module.exports = RPC_SUBSCRIBE_FUNCTION_HELPER;
