var Path = require("path");
var Fs = require("fs");

module.exports = function (sandbox) {
    this.$normalizeCallback = function (fn) {
        if (typeof fn !== "function") {
            return function () {};
        }
        
        return fn;
    };
    
    /**
     * Resolves the path given a path relative to a project folder
     */
    this.$resolvePath = function (relativePath, callback) {
        sandbox.getProjectDir(function (err, projectDir) {
            if (err) return callback(err);
            
            var path = Path.join(projectDir, relativePath);
            path = Path.normalize(path);
            
            if (path.indexOf(projectDir) !== 0) {
                return callback("Can't step out project dir... " + path);
            }
            
            callback(null, path);
        });
    };
    
    /**
     * Wrapper around Path.exists
     */
    this.exists = function (path, callback) {
        var self = this;
        
        callback = this.$normalizeCallback(callback);
        
        self.$resolvePath(path, function (err, path) {
            if (err) return callback(err);
            
            Path.exists(path, function (exists) {
                callback(null, exists);
            });
        });
    };
    
    /**
     * Wrapper around fs.readFile
     */
    this.readFile = function () {
        var fnArgs = arguments;
        
        var path = fnArgs[0];
        var callback = this.$normalizeCallback(fnArgs[fnArgs.length - 1]);
        
        this.$resolvePath(path, function (err, path) {
            if (err) return callback(err);
            
            // first copy the array with slice(0), then remove the first arg
            var args = [].slice.call(fnArgs).slice(1);
            Fs.readFile.apply(Fs, [path].concat(args));
        });
    };
    
    /**
     * Wrapper around fs.writeFile
     */
    this.writeFile = function () {
        var fnArgs = arguments;
        
        var path = fnArgs[0];
        var callback = this.$normalizeCallback(fnArgs[fnArgs.length - 1]);
        
        this.$resolvePath(path, function (err, path) {
            if (err) return callback(err);
            
            // first copy the array with slice(0), then remove the first arg
            var args = [].slice.call(fnArgs).slice(1);
            
            // pop the last argument cause we want to override it (if its a function of course)
            var lastArg = args.pop();
            if (typeof lastArg === "function") {
                lastArg = function (err) {
                    if (err) return callback(err);
                    
                    sandbox.getUnixId(function (err, unixId) {
                        if (err || !unixId) return callback(err);
                        
                        Fs.chown(path, unixId, unixId, function (err) {
                            if (err) return callback(err);
                            
                            // @todo, do a chmod here?
                            
                            callback();
                        });
                    });
                };
            }
            
            Fs.writeFile.apply(Fs, [path].concat(args).concat([lastArg]));
        });     
    };
    
    /**
     * Wrapper around chmod
     */
    this.chmod = function () {
        var fnArgs = arguments;
        
        var path = fnArgs[0];
        var callback = this.$normalizeCallback(fnArgs[fnArgs.length - 1]);
        
        this.$resolvePath(path, function (err, path) {
            if (err) return callback(err);
            
            // first copy the array with slice(0), then remove the first arg
            var args = [].slice.call(fnArgs).slice(1);
            Fs.chmod.apply(Fs, [path].concat(args));
        });
    };
};