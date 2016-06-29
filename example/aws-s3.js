var formidable = require('formidable');
var http = require('http');
var util = require('util');
var AWS      = require('aws-sdk');
var Promise = require('bluebird');
var config = require('./config');
var s3 = new AWS.S3({
    accessKeyId: config.get('S3_ACCESS_KEY'),
    secretAccessKey: config.get('S3_SECRET_KEY'),
    apiVersion: '2006-03-01'
});
var s3Stream = require('s3-upload-stream')(s3);
var bucket = 'bucket-name';
var key = 'abcdefgh';


http.createServer(function(req, res) {

    if (req.url == '/upload' && req.method.toLowerCase() == 'post') {

        var form = new formidable.IncomingForm();
        form.on('progress', function(bytesReceived, bytesExpected) {
            //console.log('onprogress', parseInt( 100 * bytesReceived / bytesExpected ), '%');
        });

        form.on('error', function(err) {
            console.log('err',err);
        });

        // This 'end' is for the client to finish uploading
        // upload.on('uploaded') is when the uploading is
        // done on AWS S3
        form.on('end', function() {
            console.log('ended!!!!', arguments);
        });

        form.on('aborted', function() {
            console.log('aborted', arguments);
        });

        form.onPart = function(part) {
            console.log('part',part);
            // part looks like this
            //    {
            //        readable: true,
            //        headers:
            //        {
            //            'content-disposition': 'form-data; name="upload"; filename="00video38.mp4"',
            //            'content-type': 'video/mp4'
            //        },
            //        name: 'upload',
            //            filename: '00video38.mp4',
            //        mime: 'video/mp4',
            //        transferEncoding: 'binary',
            //        transferBuffer: ''
            //    }

            var start = new Date().getTime();
            var upload = s3Stream.upload({
                "Bucket": bucket,
                "Key": part.filename
            });

            // Optional configuration
            //upload.maxPartSize(20971520); // 20 MB
            upload.concurrentParts(5);

            // Handle errors.
            upload.on('error', function (error) {
                console.log('errr',error);
            });
            upload.on('part', function (details) {
                console.log('part',details);
            });
            upload.on('uploaded', function (details) {
                var end = new Date().getTime();
                console.log('it took',end-start);
                console.log('uploaded',details);
            });

            // Maybe you could add compress like
            // part.pipe(compress).pipe(upload)
            part.pipe(upload);
        };

        form.parse(req, function(err, fields, files) {
            console.log('err',arguments);
            res.writeHead(200, {'content-type': 'text/plain'});
            res.write('received upload:\n\n');
            res.end(util.inspect({fields: fields, files: files}));
        });
        return;
    }

    // show a file upload form
    res.writeHead(200, {'content-type': 'text/html'});
    res.end(
        '<form action="/upload" enctype="multipart/form-data" method="post">'+
        '<input type="text" name="title"><br>'+
        '<input type="file" name="upload" multiple="multiple"><br>'+
        '<input type="submit" value="Upload">'+
        '</form>'
    );
}).listen(8080);
