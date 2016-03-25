var gulp = require('gulp');

var footer = require('gulp-footer'),
    header = require('gulp-header'),
    ngModuleSort = require('gulp-ng-module-sort'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    replace = require('gulp-replace'),
    rename = require('gulp-rename'),
    git = require('gulp-git'),
    filter = require('gulp-filter'),
    runSequence = require('run-sequence'),
    bump = require('gulp-bump'),
    gutil = require('gulp-util'),
    fs = require('fs');

var scriptsGlob = 'src/**/*.js', outfile = 'angular-audio-recorder';


gulp.task('angularScripts', function () {

    return gulp.src('src/angular/**/*.js')
        .pipe(ngModuleSort())
        .pipe(replace(/\s*'use strict';?\s*/, ''))
        .pipe(concat(outfile + '.js'))         // do things that require all files
        .pipe(header('(function() {\n  \'use strict\';\n'))
        .pipe(footer('})();'))
        .pipe(gulp.dest('.tmp/'));
});


gulp.task('scripts', ['angularScripts'], function () {
    return gulp.src(['.tmp/' + outfile + '.js', 'src/*.js', '!src/angular/**/*.js'])
        .pipe(concat(outfile + '.js'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('minify', ['scripts'], function () {
    return gulp.src(['dist/' + outfile + '.js'])
        .pipe(uglify({
            outSourceMap: 'dist/' + outfile + ".js.map",
            mangle: true
        }))
        .pipe(rename({extname: '.min.js'}))
        .pipe(gulp.dest('dist'));
});


gulp.task('build', ['scripts', 'minify']);

gulp.task('default', ['build']);

//------------ publishing
gulp.task('bump-patch-version', function () {
    return gulp.src(['./bower.json', './package.json'])
        .pipe(bump({type: "patch"}).on('error', gutil.log))
        .pipe(gulp.dest('./'));
});

gulp.task('commit-changes', function () {
    var version = getPackageJsonVersion();
    return gulp.src('.')
        .pipe(git.add())
        .pipe(git.commit('Releasing new version ' + version));
});

gulp.task('push-changes', function (cb) {
    git.push('origin', 'master', cb);
});

gulp.task('create-new-tag', function (cb) {
    var version = getPackageJsonVersion();
    git.tag(version, 'Created Tag for version: ' + version, function (error) {
        if (error) {
            return cb(error);
        }
        git.push('origin', 'master', {args: '--tags'}, cb);
    });
});

function getPackageJsonVersion() {
    //We parse the json file instead of using require because require caches multiple calls so the version number won't be updated
    return JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
}

gulp.task('release', function (callback) {
    runSequence(
        //'default',
        'build',
        'bump-patch-version',
        'commit-changes',
        'push-changes',
        'create-new-tag',
        function (error) {
            if (error) {
                console.log(error.message);
            } else {
                console.log('RELEASE FINISHED SUCCESSFULLY');
            }
            callback(error);
        });
});