var packerCmd = require('../packerCmd/packerCmd')(),
  fs = require('fs')

module.exports = function(){

  //Create a PackerFile Class.
  /*
    PackerFile
    Attrs:
      filePath = filePath of the packer.json file IF it exists
      builders = [] of builders
      provisioners = [] of provisioners
      post-processors = [] of postProcessors
      variables = {} typical object

    Methods:
      filePath = Will set the file path. Used for chaining pre-write/build
      write = Will create a random file OR use one already create and write the JSON output of the packer file.
      clean = Will destroy the packer file if one exists. Returns true or false.
      read = If there is a set filePath for a PackerFile, it will be read and its attributes set to the object

  */
  var PackerFile = function(opts){
    if(!opts){
      opts = {}
    }

    this.filePath = opts.filePath
    this.builders = opts.builders || []
    this.provisioners = opts.provisioners || []
    this['post-processors'] = opts['post-processors'] || []
    this.variables = opts.variables || {}

    if(this.filePath){
      this.read()
    }
  }

  PackerFile.prototype.filePath = function(filePath){
    this.filePath = filePath
    return this
  }

  PackerFile.prototype.write = function(workingDirectory, cb){
    var self = this

    if(typeof workingDirectory == 'function'){
      cb = workingDirectory
      workingDirectory = null
    }

    if(!self.filePath){
      //Generate a random filename
      self.filePath = workingDirectory ? workingDirectory : './'
      self.filePath += Math.random().toString(36).slice(2) + '.json'
    }

    if(!cb){
      cb = function(){}
    }

    fs.writeFile(self.filePath, JSON.stringify(self.json()), cb)

    return self
  }

  //Build will either use the file in the filePath (if it exists) and execute OR
  //create a file, write to that, and then execute, and finally remove the file
  //via a clean.
  //opts is optional and appended to the build at call time
  PackerFile.prototype.build = function(opts, cb){
    self = this
    if(typeof opts == 'function'){
      cb = opts
      opts = null
    }

    if(self.filePath){
      if(!cb){
        cb = function(){}
      }
      packerCmd.build(self.filePath, opts, cb)
    } else {
      self.write(function(err){
        if(err && cb){
          cb(err)
        } else {
          packerCmd.build(self.filePath, opts, function(err, output){
            err ? cb(err, output) : self.clean(function(err){
              cb ? cb(err, output) : null
            })
          })
        }
      })
    }
    return self
  }

  //Read the current set filePath and set its values to the current PackerFile object
  PackerFile.prototype.read = function(cb){
    var self = this
    if(filePath){
      fs.readFile(self.filePath, function(err, data){
        if(err){
          cb(err)
        } else {
          var packerFile = JSON.parse(data)

          self.builders = results.builders || []
          self.provisioners = results.provisioners || []
          self['post-processors'] = results['post-processors'] || []

          cb(null)
        }
      })
    } else if(cb){
      cb(null)
    }

    return self
  }

  //If the filePath exists, destory the file
  PackerFile.prototype.clean = function(cb){
    var self = this
    if(self.filePath){
      fs.unlink(self.filePath, cb)
    } else if(cb){
      cb(null)
    }

    return self
  }

  //JSON function to provide a clean JSON representation of what's in a packer file
  PackerFile.prototype.json = function(){
    var self = this
    return {
      variables: self.variables,
      builders: self.builders,
      provisioners: self.provisioners,
      "post-processors": self['post-processors']
    }
  }

  //Builders
  require('./builders')(PackerFile)

  //Provisioners
  require('./provisioners')(PackerFile)

  //Post-Processors
  require('./postProcessors')(PackerFile)


  return PackerFile

}
