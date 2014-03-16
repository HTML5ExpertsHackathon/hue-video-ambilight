'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    version: {
      options: {
        release: 'patch'
      },
      defaults: {
        src: ['package.json', 'manifest.json', 'bower.json']
      }
    },
    compress: {
      main: {
        options: {
          archive: 'archive.zip'
        },
        files: [
          {src: [
            'manifest.json',
            '_locales/**',
            'src/**',
            'bower_components/async/lib/async.js',
            'bower_components/jquery/dist/jquery.min.js',
            'img/**'
          ], dest: '/'}
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-version');

  grunt.registerTask('default', ['version', 'compress']);
};
