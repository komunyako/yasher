var gulp = require('gulp'),
    gulpif = require('gulp-if'),
    stylus = require('gulp-stylus'),
    stylusUtils = require('gulp-stylus/node_modules/stylus').utils,
    spritesmith = require('gulp.spritesmith'),
    csso = require('gulp-csso'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    runSequence = require('run-sequence').use(gulp),
    streamqueue = require('streamqueue'),
    bower = require('main-bower-files'),
    twig = require('gulp-twig'),
    browserSync,
    nib = require('nib'),
    phast = require('stylus-phast'),
    merge = require('merge-stream'),
    path = require('path'),
    ts = require('gulp-typescript'),
    fs = require('fs'),
    through = require('through');

var optimize = false,
    spritesStorage;

/**
 * @task css
 * Run tasks [css:sprite, css:main] sequentially
 */
gulp.task('css', function(callback){
    runSequence('css:main', callback);
});

/**
 * @task css:main
 * Generate /web/*.css
 */
gulp.task('css:main', function(callback){
    var stream = gulp.src('./assets/css/*.styl')
        .pipe(stylus({use: [phast(), function(stylus){
            stylus.define('$sprites-timestamp', (new Date).getTime());
            stylus.define('$sprites', stylusUtils.coerceObject(spritesStorage, true));
        }]}))
        .on('error', function(error){
            console.log(error.message);
            callback();
        })
        .pipe(gulpif(optimize, csso()))
        .pipe(gulp.dest('./web/css'));

    if(browserSync){
        stream.pipe(browserSync.reload({stream: true}));
    }

    return stream;
});


/**
 * @task css:vendor
 * Generate /web/vendor.css
 */
gulp.task('css:vendor', function(){
    var stream = gulp.src('./assets/css/vendor/*.css');

    if(fs.existsSync('./bower.json')){
        stream = streamqueue(
            {objectMode: true},
            gulp.src(
                bower({
                    includeDev: true,
                    filter: '**/*.css'
                })
            ),
            stream
        );
    }

    stream.pipe(concat('vendor.css')).pipe(gulp.dest('./web/css'));

    return stream;
});


/**
 * @task js
 * Generate /web/js/*.js
 */
gulp.task('js', function(callback){
    var dir = './assets/js',
        dest = './web/js',
        stream;

    if(!fs.existsSync(dir)){
        return callback();
    }

    stream = gulp.src(dir + '/**/*.js')
        .pipe(concat('yasher.js'))
        .pipe(gulpif(optimize, uglify()))
        .pipe(gulp.dest(dest));

    if(browserSync){
        stream.pipe(browserSync.reload({stream: true}));
    }

    return stream;
});


/**
 * @task js:vendor
 * Generate /web/js/vendor.js
 */
gulp.task('js:vendor', function(){
    var stream = gulp.src(bower({includeDev: true, filter: '**/*.js'}))
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('./web/js'))

    if(browserSync){
        stream.pipe(browserSync.reload({stream: true}));
    }

    return stream;
});

/**
 * @task html
 * Generate /web/*.html
 */
gulp.task('html', function(callback){
    if(!fs.existsSync('./assets/html')){
        return callback();
    }

    var stream = gulp.src('./assets/html/*.twig')
        .pipe(twig({data: JSON.parse(fs.readFileSync('./assets/html/data.json'))}))
        .on('error', console.log)
        .pipe(gulp.dest('./web/'));

    if(browserSync){
        stream.pipe(browserSync.reload({stream: true}));
    }

    return stream;
});

/**
 * @task sync
 */
gulp.task('sync', function(){
    browserSync = require('browser-sync');
    browserSync({proxy: path.basename(__dirname), open: false, notify: false, ghostMode: false});
});

/**
 * @task watch
 */
gulp.task('watch', ['sync'], function(){
    gulp.watch('./assets/html/**/*.twig', ['html']);
    gulp.watch('./assets/css/**/*.styl', ['css:main']);
    gulp.watch('./assets/css/vendor/*.css', ['css:vendor']);
    gulp.watch(['./assets/js/**/*.js', './assets/js/**/*.ts', '!./assets/js/vendor/**/*.js'], ['js']);
    gulp.watch('./assets/js/vendor/**/*.js', ['js:vendor']);
});


gulp.task('default', function(){
    runSequence(
        ['css', 'css:vendor', 'js', 'js:vendor', 'html'],
        'watch'
    );
});

gulp.task('build', function(){
    optimize = true;
    runSequence(
        ['css', 'css:vendor', 'js', 'js:vendor']
    );
});

