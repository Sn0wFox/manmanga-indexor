"use strict";

const gulp = require('gulp');                     // Local gulp lib
const gjasmine = require('gulp-jasmine');         // To build and run tests
const gtypescript = require('gulp-typescript');   // To make gulp work with TypeScript compiler
const del = require('del');                       // To erase some file during cleaning tasks

const tscConfig = require('./tsconfig.json');     // Gather the options for TypeScript compiler

/**
 * Compiles TypeScript files from src/
 * using the typings.
 */
gulp.task('build', () => {
  return gulp
    .src(['src/**/*.ts', 'node_modules/@types/**/*.ts', '!src/**/*.spec.ts'])
    .pipe(gtypescript(tscConfig.compilerOptions))
    .pipe(gulp.dest('dist'));
});

/**
 * Removes all files in the dist/ directory.
 */
gulp.task('clean', () => {
  return del('dist/**/*');
});

/**
 * Builds all .spec.ts files,
 * needed to run tests.
 */
gulp.task('test:build', () => {
  return gulp.src(['src/**/*.spec.ts', 'node_modules/@types/**/*.ts'])
    .pipe(gtypescript(tscConfig.compilerOptions))
    .pipe(gulp.dest('dist'));
});

/**
 * Runs all files .spec.js for the lib,
 * aka lib tests.
 */
gulp.task('test:run', (done) => {
  return gulp.src('dist/**/*.spec.js')
    .pipe(gjasmine());
});

/**
 * Cleans all .spec.js files in the dist/ folder,
 * aka test files.
 */
gulp.task('test:clean', () => {
  return del('dist/**/*.spec.js');
});

/**
 * Builds, runs and thereafter cleans
 * all tests.
 */
gulp.task('test', gulp.series(
    'test:clean',
    gulp.parallel('build', 'test:build'),
    'test:run',
    'test:clean'));