const express = require('express');
const sharp = require('sharp');
const User = require('../models/user');
const auth = require('../middleware/auth');
const multer = require('multer');
const router = express.Router();

router.post('/users', async(req, res)=>{
    const user = new User(req.body)
    try{
        const token = await user.generateAuthToken();
        //await user.save()
        res.status(201).send({user, token});
    }catch(err){
        res.status(400).send(err);
    }
})
router.post('/users/login', async(req, res)=>{
    try{
        //findUserByCredentials is a custom method defined in user model/ facility by mongoose 
        const user = await User.findUserByCredentials(req.body.email, req.body.password);
        const token =await user.generateAuthToken();
        if(!user){
            return res.status(400).send();
        }
        res.send({user, token});
    }catch(err){
        res.status(400).send();
    }
    
    
})
router.post('/users/logout', auth, async(req, res)=>{
    try{
        req.user.tokens = req.user.tokens.filter(token=>{
            return token.token!==req.token;
        })
        await req.user.save();
        res.send();
    }catch(err){
        res.status(500).send();
    }
})
router.post('/users/logoutAll', auth, async(req, res)=>{
    try{
        req.user.tokens = [];
        await req.user.save();
        res.send();
    }catch(err){
        res.status(500).send();
    }
})
router.get('/users/me', auth, (req, res)=>{
        res.send(req.user);
    })

router.patch('/users/me', auth, async(req, res)=>{
    
        const updates = Object.keys(req.body);
        const updateValid = ['name', 'email', 'age', 'password'];
        const isValid = updates.every(update => updateValid.includes(update));
        if(!isValid){
            return res.status(400).send({Error: "invalid propety can not be added"});
        }
        try{
            updates.forEach(update => req.user[update] = req.body[update]);
            await req.user.save();
            res.send(req.user);
        }catch(err){
            res.send(500).send(err);
        }
        
    })
router.delete('/users/me', auth, async(req, res)=>{
        try{
            await req.user.remove();
            res.send(req.user);
        }catch(err){
            res.status(500).send(err);
        }
})
const upload = new multer({
    limits:{
        fileSize: 1000000
    },
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('Please upload an image file'));
        }
        cb(undefined, true)
    }
})
router.post('/users/me/avatar', auth, upload.single('avatar'), async(req, res)=>{
    const buffer = await sharp(req.file.buffer).resize({width:250, height:250}).png().toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
}, (error, req, res, next)=>{
    res.status(400).send({error: error.message})
}) 
router.delete('/users/me/avatar', auth, async(req, res)=>{
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
}) 
router.get('/users/:id/avatar', async(req, res)=>{
    try{

        const user = await User.findById(req.params.id);
        if(!user || !user.avatar){
            throw new Error;
           
        }
        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    }catch(err){
        return res.status(404).send();
    }
})  
    module.exports = router;