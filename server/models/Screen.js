// models/Screen.js
const mongoose = require('mongoose');
const {Schema} = mongoose;
const Image = require("./Image");

const timeRangeSchema = new mongoose.Schema({
    start: {
        type: String,
        required: true
    },
    end: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        default: false
    }
});

const textTimeRangeSchema = new mongoose.Schema({
    start: {
        type: String,
        required: true
    },
    end: {
        type: String,
        required: true
    },
    text: {
        type: String,
        default: ""
    },
    backgroundColor: {
        type: String,
        default: ""
    },
    textColor: {
        type: String,
        default: ""
    },
    slideTime: {
        type: Number,
        default: 120
    },
    enabled: {
        type: Boolean,
        default: false
    }
});

const darkModeSchema = new mongoose.Schema({
    ranges: {
        type: [timeRangeSchema],
        default: [
            {
                start: "00:00",
                end: "06:00",
                enabled: true
            },
            {
                start: "19:00",
                end: "00:00",
                enabled: true
            }
        ]
    }
});

const textSlidesSchema = new mongoose.Schema({
    ranges: {
        type: [textTimeRangeSchema],
        default: []
    }
});

const screenSchema = new Schema({
    users: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                required: true,
                default: "editor"
            },
            creation: {
                type: Date,
                default: Date.now()
            },
            permissions: {
                type: Array,
                default: []
            }
        }
    ],
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        default: "Écran"
    },
    logo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: false
    },
    featured_image: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: false
    },
    icons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: false
    }],
    meteo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meteo'
    },
    directions: [
        {
            arrow: {
                style: {
                    type: String,
                    default: ""
                },
                orientation: {
                    type: String,
                    default: ""
                }
            },
            title: {
                color: {
                    type: String,
                    default: ""
                },
                text: {
                    type: String,
                    default: ""
                }
            },
            description: {
                type: String,
                default: ""
            }
        }
    ],
    photos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Image',
        required: false
    }],
    text_slides: {
        type: textSlidesSchema,
        default: () => ({
            ranges: []
        })
    },
    config: {
        hide_slider_dots: {
            type: Boolean,
            default: false
        },
        photos_interval: {
            type: Number,
            default: 10
        },
        meteo_corner: {
            type: String,
            enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
            default: 'top-left'
        }
    },
    dark_mode: {
        type: darkModeSchema,
        default: () => ({
            ranges: [
                {
                    start: "00:00",
                    end: "06:00",
                    enabled: true
                },
                {
                    start: "19:00",
                    end: "00:00",
                    enabled: true
                }
            ]
        })
    },
    status: {
        type: String,
        enumerable: ["online", "offline"],
        required: true,
        default: "offline"
    },
    deviceTokenHash: {
        type: String,
        default: null,
        select: false
    },
    deviceTokenIssuedAt: {
        type: Date,
        default: null
    },
    creation: {
        type: Date,
        default: Date.now()
    }
});

screenSchema.pre('save', async function (next) {
    if (!this.featured_image) {
        const defaultFeaturedImage = await Image.findOne({system: 'default-featured-image'});
        if (defaultFeaturedImage) {
            this.featured_image = defaultFeaturedImage._id;
        } else {
            const newFeaturedImage = new Image({
                type: 'featured_image',
                screen: null,
                value: 'public/template-screen-image.png',
                where: 'server',
                system: 'default-featured-image'
            });
            await newFeaturedImage.save();
            this.featured_image = newFeaturedImage._id;
        }
    }
    next();
});


screenSchema.pre(/^find/, function (next) {
    this.populate('logo')
        .populate('featured_image')
        .populate('photos')
        .populate('icons')
        .populate('meteo')
        .populate('text_slides')
        .populate('dark_mode');
    next();
});


screenSchema.methods.populateFields = async function () {
    await this.populate([
        {path: 'logo'},
        {path: 'featured_image'},
        {path: 'photos'},
        {path: 'icons'},
        {path: 'meteo'},
        {path: 'text_slides'},
        {path: 'dark_mode'}
    ]);
    return this;
};

module.exports = mongoose.model('Screen', screenSchema);
