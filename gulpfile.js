'use strict';
/* VARIABLES
 ********************************************************/
var
  gulp = require('gulp'),
  // Sass
  sass = require('gulp-sass'),
  rename = require("gulp-rename"),
  cleanCSS = require('gulp-clean-css'), // set to (Sass,Build)
  autoprefixer = require('gulp-autoprefixer'),
  gcmq = require('gulp-group-css-media-queries'),
  // Jade
  jade = require('gulp-jade'),
  jadeInheritance = require('gulp-jade-inheritance'),
  prettify = require('gulp-html-prettify'),
  changed = require('gulp-changed'),
  cached = require('gulp-cached'),
  gulpif = require('gulp-if'), // set to (Jade,Build)
  filter = require('gulp-filter'),
  // Tools
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  plumber = require('gulp-plumber'), // set to (Sass,Jade)
  wiredep = require('wiredep').stream,
  // Destination path
  appDir = 'app/',
  buildDir = 'www/',
  dateJade = require('./app/jade/_template/_data.json');

/* PREPROCESSING
 ********************************************************/
  // Sass
  gulp.task('sass', function () {
    return gulp.src(appDir+'sass/main.scss')
      .pipe(plumber())
      .pipe(sass().on('error', sass.logError))
      .pipe(autoprefixer({ browsers: ['last 25 versions'] }))
      .pipe(gcmq())
      .pipe(rename('theme.min.css'))
      .pipe(gulp.dest(appDir+'css/'))
      .pipe(reload({ stream:true }));
  });
  // Jade
  gulp.task('jade', function() {
    return gulp.src(appDir+'jade/**/*.jade')
      .pipe(plumber())
      .pipe(changed(appDir, {extension: '.html'}))
      .pipe(gulpif(global.isWatching, cached('jade')))
      .pipe(jadeInheritance({basedir: appDir+'jade'}))
      .pipe(filter(function (file) {
        return !/\/_/.test(file.path) && !/^_/.test(file.relative);
      }))
      .pipe(jade({ pretty: true, data: dateJade }))
      .pipe(prettify({indent_char: ' ', indent_size: 2}))
      .pipe(gulp.dest(appDir))
      .pipe(reload({ stream:true }));
  });
  gulp.task('setWatch', function() {
    global.isWatching = true;
  });
  // BrowserSync
  gulp.task('serve', ['setWatch','sass','jade','bower'], function() {
    browserSync.init({
      server: {baseDir: appDir},
      notify: false
    });
  });
  // Bower Wiredep
  gulp.task('bower', function () {
    gulp.src(appDir+'jade/**/{_styles,_scripts}.jade')
      .pipe(wiredep({ ignorePath: /^(\.\.\/)*\.\./ }))
      .pipe(gulp.dest(appDir+'jade/'));
  });

/* WATCH
 ********************************************************/
gulp.task('watch', function() {
  gulp.watch(appDir+'sass/**/*.+(scss|sass)', ['sass']);
  gulp.watch(appDir+'jade/**/*.jade', ['jade']);
  gulp.watch('bower.json', ['bower']);
  gulp.watch([
    appDir+'js/*.js'
  ]).on('change', reload);
});
// combination tasks
gulp.task('default', ['serve','watch']);


/* BUILD TASKS
 ********************************************************/
// Variables build
var
  runSequence = require('run-sequence'), // set to (DEPLOOY)
  clean = require('gulp-clean'),
  size = require('gulp-size'),
  cache = require('gulp-cache'),
  imagemin = require('gulp-imagemin'),
  pngquant = require('imagemin-pngquant'),
  uglify = require('gulp-uglify'),
  useref = require('gulp-useref'),
  rev = require('gulp-rev-append');

// Clean dir
gulp.task('clean', function () {
  return gulp.src(buildDir, {read: false})
    .pipe(clean());
});
// Transfer the HTML, CSS, JS into dist
gulp.task('useref', function () {
  return gulp.src(appDir+'*.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', cleanCSS({compatibility: 'ie8'})))
    .pipe(rev())
    .pipe(gulp.dest(buildDir));
});
// Transferring Fonts
gulp.task('theme:css', function () {
  gulp.src(appDir+'css/theme.min.css')
    .pipe(cleanCSS({compatibility: 'ie8'}))
    .pipe(gulp.dest(buildDir+'css/'));
});
// Transferring Fonts
gulp.task('fonts', function () {
  gulp.src(appDir+'fonts/**/*')
    .pipe(gulp.dest(buildDir+'fonts/'));
});
// Transferring and compress img
gulp.task('img', function () {
  return gulp.src(appDir+'images/**/*')
    .pipe(cache(imagemin({
      interlaced: true,
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    })))
    .pipe(gulp.dest(buildDir+'images/'));
});
// We transfer the remaining files (.ico, .htaccess, etc ...)
gulp.task('extras', function () {
  return gulp.src(['app/{.*,*.*}','!app/*.html'])
  .pipe(gulp.dest(buildDir));
});
// Transferring js
gulp.task('js', function () {
  gulp.src(appDir+'js/**/*')
    .pipe(gulp.dest(buildDir+'js/'));
});

// Build folder DIST
gulp.task('dist', ['useref','theme:css','fonts','img','extras','js'], function () {
  return gulp.src(buildDir+'**/*').pipe(size({title: 'build'}));
});
// Build folder DIST (only after compiling "Sass, Jade")
gulp.task('b', function (cb) {
  runSequence(['sass','jade'],'clean','dist', cb);
});


/* DEPLOOY
 ********************************************************/
var
  gutil = require('gulp-util'),
  ftp = require('vinyl-ftp');

gulp.task('http', function () {
  var
    urlDir = '/sergeypodolsky.ru/public_html/work/2017/04/demo/',
    conn = ftp.create({
      host:     '92.53.96.109',
      user:     'podolskiis',
      password: '9999999999',
      parallel: 10,
      log: gutil.log
    }),
    globs = [
      buildDir+'**/*',
      buildDir+'**/.*'
    ];
  return gulp.src(globs, {base: buildDir, buffer: false})
    .pipe(conn.dest(urlDir));
});

/* BUILD and DEPLOOY  in the loop
 ********************************************************/
gulp.task('b:f', function(cb) {
  runSequence('b', 'http', cb);
});
