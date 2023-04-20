const {
    HandleRPCFunction
} = require('../response');

const RPC_EXPOSE_HELPER = {
    exposeList: {},
    /**
     * @setExposeList
     * @public
     * @param _param object - key => action
     */
    setExposeList(_param = {}) {
    	let _exposeList = {};
    	for (let key in _param) {
    		let action = _param[key];
    		_exposeList[key] = async(data) => {
    			return HandleRPCFunction(action, data, key);
    		};
    	}
    	this.exposeList = _exposeList;
    	return _exposeList;
    }
};

module.exports = RPC_EXPOSE_HELPER;
