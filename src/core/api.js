"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickTickApi = void 0;
var axios_1 = require("axios");
var configstore_1 = require("configstore");
var fs = require("fs");
var path = require("path");
var pkgPath = path.join(__dirname, '../../package.json');
var pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
var TickTickApi = /** @class */ (function () {
    function TickTickApi() {
        var _this = this;
        this.token = null;
        this.config = new configstore_1.default(pkg.name);
        this.client = axios_1.default.create({
            baseURL: 'https://api.ticktick.com/api/v2',
            headers: {
                'User-Agent': "".concat(pkg.name, "/").concat(pkg.version),
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        });
        // Load token from config
        this.token = this.config.get('token') || null;
        // Add request interceptor for authentication
        this.client.interceptors.request.use(function (config) {
            if (_this.token) {
                config.headers.Cookie = "t=".concat(_this.token);
            }
            return config;
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use(function (response) { return response; }, function (error) {
            if (error.response) {
                var data = error.response.data;
                if (data && data.errorCode) {
                    if (data.errorCode === 'user_not_sign_on') {
                        throw new Error('Authentication required. Please login first.');
                    }
                    throw new Error("".concat(data.errorCode, ": ").concat(data.errorMessage || 'Unknown error'));
                }
                throw new Error("API error: ".concat(error.response.status, " ").concat(error.response.statusText));
            }
            throw new Error("Network error: ".concat(error.message));
        });
    }
    TickTickApi.prototype.login = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var response, token, userResponse, user, error_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.client.post('/user/signon', {
                                username: username,
                                password: password,
                            }, {
                                params: {
                                    wc: true,
                                    remember: true,
                                },
                            })];
                    case 1:
                        response = _c.sent();
                        token = response.data.token;
                        if (!token) {
                            throw new Error('Login failed: No token received');
                        }
                        this.token = token;
                        this.config.set('token', token);
                        return [4 /*yield*/, this.client.get('/user/preferences/settings', {
                                params: { includeWeb: true },
                            })];
                    case 2:
                        userResponse = _c.sent();
                        user = {
                            id: userResponse.data.id,
                            username: username,
                            email: userResponse.data.email || username,
                            name: userResponse.data.name || username,
                        };
                        this.config.set('user', user);
                        return [2 /*return*/, user];
                    case 3:
                        error_1 = _c.sent();
                        if ((_b = (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errorCode) {
                            throw new Error("Login failed: ".concat(error_1.response.data.errorCode));
                        }
                        throw new Error("Login failed: ".concat(error_1.message));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.getProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get('/projects')];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_2 = _a.sent();
                        throw new Error("Failed to get projects: ".concat(error_2.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.getProjectById = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get("/projects/".concat(projectId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_3 = _a.sent();
                        throw new Error("Failed to get project: ".concat(error_3.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.createProject = function (name_1) {
        return __awaiter(this, arguments, void 0, function (name, color) {
            var response, error_4;
            if (color === void 0) { color = '#4A90E2'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post('/projects', {
                                name: name,
                                color: color,
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_4 = _a.sent();
                        throw new Error("Failed to create project: ".concat(error_4.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.updateProject = function (projectId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.put("/projects/".concat(projectId), updates)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_5 = _a.sent();
                        throw new Error("Failed to update project: ".concat(error_5.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.deleteProject = function (projectId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.delete("/projects/".concat(projectId))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        throw new Error("Failed to delete project: ".concat(error_6.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.getTasks = function (projectId, completed) {
        return __awaiter(this, void 0, void 0, function () {
            var params, response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        params = {};
                        if (projectId)
                            params.projectId = projectId;
                        if (completed !== undefined)
                            params.completed = completed;
                        return [4 /*yield*/, this.client.get('/batch/task', { params: params })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_7 = _a.sent();
                        throw new Error("Failed to get tasks: ".concat(error_7.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.getTaskById = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.get("/batch/task/".concat(taskId))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_8 = _a.sent();
                        throw new Error("Failed to get task: ".concat(error_8.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.createTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post('/batch/task', task)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_9 = _a.sent();
                        throw new Error("Failed to create task: ".concat(error_9.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.updateTask = function (taskId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.put("/batch/task/".concat(taskId), updates)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_10 = _a.sent();
                        throw new Error("Failed to update task: ".concat(error_10.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.deleteTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.delete("/batch/task/".concat(taskId))];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_11 = _a.sent();
                        throw new Error("Failed to delete task: ".concat(error_11.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.completeTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post("/batch/task/".concat(taskId, "/complete"))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_12 = _a.sent();
                        throw new Error("Failed to complete task: ".concat(error_12.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.uncompleteTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post("/batch/task/".concat(taskId, "/uncomplete"))];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_13 = _a.sent();
                        throw new Error("Failed to uncomplete task: ".concat(error_13.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TickTickApi.prototype.get = function (url, config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.client.get(url, config)];
            });
        });
    };
    TickTickApi.prototype.post = function (url, data, config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.client.post(url, data, config)];
            });
        });
    };
    TickTickApi.prototype.put = function (url, data, config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.client.put(url, data, config)];
            });
        });
    };
    TickTickApi.prototype.delete = function (url, config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.client.delete(url, config)];
            });
        });
    };
    TickTickApi.prototype.setToken = function (token) {
        this.token = token;
        this.config.set('token', token);
    };
    TickTickApi.prototype.clearToken = function () {
        this.token = null;
        this.config.delete('token');
        this.config.delete('user');
    };
    TickTickApi.prototype.getToken = function () {
        return this.token;
    };
    TickTickApi.prototype.isAuthenticated = function () {
        return !!this.token;
    };
    TickTickApi.prototype.logout = function () {
        this.clearToken();
    };
    return TickTickApi;
}());
exports.TickTickApi = TickTickApi;
