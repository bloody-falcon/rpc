/*
* create by falcon at 20/04/2023
*/
/**
 * Response Codes
 */
const RESPONSE_CODE = {
    SUCCESS: 200,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNATHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
};

/**
 * STANDARDIZED HTTP RESPONSE
 */
class HttpResponse {
    constructor(
        code = RESPONSE_CODE.SUCCESS,
        message = "",
        data = null,
    ) {
        this.code = code;
        this.success = this.code === RESPONSE_CODE.SUCCESS ? true : false;
        this.message = message;
        this.data = data;
    }
};

const RESPONSE_HELPER = {

    HandleRPCResponse: (data ={}) => {
        const r = new HttpResponse(
            RESPONSE_CODE.SUCCESS,
            "ok",
            data,
        );
        return r;
    },

    HandleRPCError: (input, error, methodName) => {
        if (error.code) {
            const r = new HttpResponse(
                error.code,
                error.message,
            );
            return r;
        } else {
            const r = new HttpResponse(
                RESPONSE_CODE.INTERNAL_SERVER_ERROR,
                "Something went wrong with your request",
            );
            return r;
        }
    }
};

module.exports = {
    async HandleRPCFunction(rpcFunction, inputData, METHOD_NAME) {
        try {
            let data = await rpcFunction(inputData, METHOD_NAME);

            if (data == null) return RESPONSE_HELPER.HandleRPCResponse();

            if (data) return RESPONSE_HELPER.HandleRPCResponse(data);

            return RESPONSE_HELPER.HandleRPCError({ message: data.message }, METHOD_NAME);

        } catch (err) {
            return RESPONSE_HELPER.HandleRPCError({}, err, METHOD_NAME);
        }
    }
}
