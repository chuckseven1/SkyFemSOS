import * as Bluebird from 'bluebird';

import * as gulp from 'gulp';
import * as ts from 'gulp-typescript';
import * as jeditor from 'gulp-json-editor';
import * as rename from 'gulp-rename';
import * as zip from 'gulp-zip';
// @ts-ignore
import * as clean from 'gulp-clean';

const tsProject = ts.createProject('tsconfig.json');

// Load info to generate module.json
const { version, author, description } = require('./package.json');
const now = new Date();

gulp.task('clean', function () {
  return gulp.src('dist', { read: false, allowEmpty: true }).pipe(clean());
});

gulp.task(
  'build',
  gulp.series('clean', async function () {
    return Bluebird.all([
      tsProject
        .src()
        .pipe(tsProject())
        .js.on('error', console.log)
        .pipe(gulp.dest('dist')),

      gulp.src('partials/*.html').pipe(gulp.dest('dist/partials')),

      gulp
        .src('module.json')
        .pipe(
          jeditor({
            version,
            author,
            description,
            // TODO: Check get for modified date?
            updated: `${
              now.getMonth() + 1
            }/${now.getDate()}/${now.getFullYear()}`,
          })
        )
        .pipe(gulp.dest('dist')),

      gulp.src('LICENSE').pipe(gulp.dest('dist')),

      //gulp.src('README.md').pipe(gulp.dest('dist'))
    ]);
  })
);

gulp.task('release', async function () {
  const { id, version } = require('./dist/module.json');
  const zipFileName = `${id}-v${version}.zip`;

  console.log(`Packaging ${zipFileName}`);

  return gulp
    .src('dist/**/*', { base: 'dist/' })
    .pipe(
      rename((path) => {
        path.dirname = `${id}/${path.dirname}`;
      })
    )
    .pipe(zip(zipFileName))
    .pipe(gulp.dest('.'));
});

gulp.task('default', gulp.series('build', 'release'));
