const { Beer, Aroma} = require('../../../models');

const selectService = require('../../service/selectService');
const heartService = require('../../service/heartService');
const informationService = require("../../service/informationService");

const util = require('../../../modules/util');
const statusCode = require('../../../modules/statusCode');
const responseMessage = require('../../../modules/responseMessage');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

/**
 * @좋아하는_향_맥주_전체_불러오기
 * @desc 좋아하는 향 beer 전체 불러오기 (오프셋 페이징)
 */
module.exports = {
  getAllAromaBeer: async (req, res) => {
    const user_id = req.token_data.id;
    const { page, size } = req.query;
    if (!page || !size) {
      return res.status(statusCode.BAD_REQUEST).send(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_PAGE_OR_SIZE));
    }

    const { limit, offset } = await informationService.get_pagination(page, size);
    try {
      //향 배열로 불러오기 [ 4, 5, 6, 7, 8 ]
      const value = 'aroma';
      const aromaArray = await selectService.ChangeSelectArray({ user_id, value });
      if (!aromaArray) {
        return res.status(statusCode.OK).json([]);
      }

      const beers = await Beer.findAndCountAll({
        attributes: ['id', 'k_name', 'e_name', 'star_avg', 'thumbnail_image', 'aroma_id_1', 'aroma_id_2', 'aroma_id_3', 'aroma_id_4'],
        where: {
          [Op.or]: [
            {
            'aroma_id_1': {
              [Op.or]: aromaArray
            },
          }],
          [Op.or]: [{
            'aroma_id_2': {
              [Op.or]: aromaArray
            }
          }],
        },
        limit: limit,
        offset: offset,
        order: [
          ['id', 'ASC']
        ],
        raw: true
      });
      const beer_data = [];
      for await (let beer_detail of beers.rows) {
        beer_detail.aroma = []
        if (beer_detail.aroma_id_1) {
          const aroma_name_1 = await Aroma.findOne({
            attributes: ['aroma'],
            where: {
              id: beer_detail.aroma_id_1
            },
            raw: true
          })
          beer_detail.aroma.push(aroma_name_1.aroma)
        }
        if (beer_detail.aroma_id_2) {
          const aroma_name_2 = await Aroma.findOne({
            attributes: ['aroma'],
            where: {
              id: beer_detail.aroma_id_2
            },
            raw: true
          })
          beer_detail.aroma.push(aroma_name_2.aroma)
        }
        if (beer_detail.aroma_id_3) {
          const aroma_name_3 = await Aroma.findOne({
            attributes: ['aroma'],
            where: {
              id: beer_detail.aroma_id_3
            },
            raw: true
          })
          beer_detail.aroma.push(aroma_name_3.aroma)
        }
        if (beer_detail.aroma_id_4) {
          const aroma_name_4 = await Aroma.findOne({
            attributes: ['aroma'],
            where: {
              id: beer_detail.aroma_id_4
            },
            raw: true
          })
          beer_detail.aroma.push(aroma_name_4.aroma)
        }
        beer_data.push(beer_detail)
        delete beer_detail.aroma_id_1
        delete beer_detail.aroma_id_2
        delete beer_detail.aroma_id_3
        delete beer_detail.aroma_id_4
      }
      let beers_ids = [];   //[ 6, 7, 12, 28 ]
      for (let i in beers.rows) {
        beers_ids[i] = beers.rows[i].id;
      }

      let heart_list = [];    //[ true, true, false, false, false ]
      for (let i in beers_ids) {
        const beer_id = beers_ids[i];
        const alreadyHeart = await heartService.HeartCheck({ user_id, beer_id });
        if (alreadyHeart === 'Y') { heart_list.push(true); }
        if (alreadyHeart === 'N') { heart_list.push(false); }
      }

      function mergeObj(obj1, obj2) {
        const newObj = [];
        for (let i in obj1) {
          newObj[i] = obj1[i];
        }
        for (let i in obj2) {
          newObj[i].heart = obj2[i];
        }
        return newObj;
      }
      const merge_aroma = mergeObj(beers.rows, heart_list);
      const result = await informationService.get_paging_data(beers, page, limit);

      return res.status(statusCode.OK).send(result);
    } catch (error) {
      console.error(error);
      return res.status(statusCode.INTERNAL_SERVER_ERROR).send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.BEER_READ_ALL_FAIL));
    }
  },
};