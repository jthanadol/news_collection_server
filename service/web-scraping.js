const puppeteer = require('puppeteer');

let browser = null;
// const proxyList = ['http://45.140.143.77:18080'];

async function scrapeWeb(url, title) {
  if (browser == null) {
    browser = await puppeteer.launch({
      headless: true,
      // args: proxyList.map((i) => {
      //   return `--proxy-server=${i}`;
      // }),
    });
  }

  try {
    let page = await browser.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const tag = getTag(page.url());
    console.log(tag);

    let waitTag = 'h1';
    if (url.indexOf('thenews.com.pk/tns/') != -1) {
      waitTag = 'h2';
    }
    await page.waitForSelector(waitTag);


    const bodyContent = await page.evaluate(() => document.body.textContent);
    //console.log(htmlString)
    let listContent = await page.$$eval(tag[1], (listP) =>
      listP.map((p) => p.innerText)
    ); //เอา text ใน tag p ทั้งหมด
    let listSubTitle = []
    if (tag[0] != '') {
      listSubTitle = await page.$$eval(tag[0], (listH2) =>
        listH2.map((h2) => h2.innerText)
      ); //เอา text ใน tag h2 ทั้งหมด
    }
    const listTitle = await page.$$eval(tag[2], (listH1) =>
      listH1.map((h1) => h1.innerText)
    ); //เอา text ใน tag h1 ทั้งหมด

    listContent = listContent.flatMap((item) => item.split('\n'));

    let content = ''; //เนื้อข่าวทั้งหมดเป็น string
    let indexTitle = 0; //ตำแหน่ง h1
    let textContent = []; //ข้อความใน tag เนื้อหา(p) ที่อยู่หลัง h1
    let textSubTitle = []; //ข้อความใน tag หัวข้อย่อ(h2) ที่อยู่หลัง h1
    let index = 0;
    if (indexTitle.length == 1) {
      indexTitle = bodyContent.indexOf(listTitle[0]);
    } else {
      for (var i = 0; i < listTitle.length; i++) {
        index = bodyContent.indexOf(listTitle[i]);
        let titleh1 = listTitle[i];
        titleh1 = titleh1.trim();
        if (titleh1 == title) {
          indexTitle = index;
          break;
        }
      }
    }
    for (var i = 0; i < listSubTitle.length; i++) {
      index = bodyContent.indexOf(listSubTitle[i]);
      if (index > indexTitle) {
        textSubTitle.push(listSubTitle[i]);
      }
    }
    for (var i = 0; i < listContent.length; i++) {
      index = bodyContent.indexOf(listContent[i]);
      if (index > indexTitle) {
        textContent.push(listContent[i]);
      }
    }

    let listContentNews = []; //เก็บเนื้อหาที่อยู่ถัดจากพาสหัวข่าว
    listContentNews.push(...textSubTitle);
    listContentNews.push(...textContent);
    listContentNews.sort((a, b) => bodyContent.indexOf(a) - bodyContent.indexOf(b));

    for (let index = 0; index < listContentNews.length; index++) {
      const element = listContentNews[index].trim();
      if (element.length != 0) {
        content += element + ' \n ';
      }
    }
    // console.log(content);
    console.log('ดึงข้อมูลจาก web : ', url);
    page.close();
    return content;
  } catch (error) {
    console.log('Web Scraping ERROR ', error);
    return '';
  }

}

function getTag(url) {
  if (url.indexOf('www.thairath') != -1) {
    if (url.indexOf('/money/') != -1) {
      return [
        '#Component > div > div > div > div.css-1vx1dtt.ex00x8q6 > div > div.css-18kfy4b.ex00x8q13 > div.css-1ant8tf.ex00x8q12 > div > h2',
        '#Component > div > div > div > div.css-1vx1dtt.ex00x8q6 > div > div.css-18kfy4b.ex00x8q13 > div.css-1ant8tf.ex00x8q12 > div > p',
        '#Component > div > div > div > div > h1',
      ];
    } else {
      return [
        '#Article_Detail > div.css-1cfn2fx.e1wlf1s61 > div > div.css-1w76fsv.e1wlf1s69 > div.css-15wzmzo.e1wlf1s68 > div.__item_article-content.css-1nsa2wl.e1wlf1s615 > div > div > div > p > strong',
        '#Article_Detail > div.css-1cfn2fx.e1wlf1s61 > div > div.css-1w76fsv.e1wlf1s69 > div.css-15wzmzo.e1wlf1s68 > div.__item_article-content.css-1nsa2wl.e1wlf1s615 > div > div > div > p',
        '#Article_Detail > div.css-1cfn2fx.e1wlf1s61 > div > div.css-1w76fsv.e1wlf1s69 > div.css-15wzmzo.e1wlf1s68 > div.__item_article-headline.css-mrn4hq.e1wlf1s67 > h1',
      ];
    }
  } else if (url.indexOf('investing.com') != -1) {
    return [
      '#article > div > h2',
      '#article > div > p, #article > div > div > p',
      '#articleTitle',
    ];
  } else if (url.indexOf('www.dailynews') != -1) {
    if (url.indexOf('/news/') != -1) {
      return [
        '#page > div > header > div > div.elementor-element.elementor-element-241f800.e-con-boxed.e-con > div > div > div',
        '#content-feed > div > div > article > div > div > p',
        '#page > div > header > div > div > div > div > div > h1',
      ];
    }
    return ['h2', 'p', 'h1'];
  } else if (url.indexOf('www.9news') != -1) {
    return [
      '#main > div > div > div.grid__section.grid__section_behavior_static.grid__section_theme_article > div.grid__content.grid__content_full-width_false > div.grid__main.grid__main_sticky_right.grid__main_full-width_false > div > div > div > article > div.article__summary',
      '#main > div > div > div.grid__section.grid__section_behavior_static.grid__section_theme_article > div.grid__content.grid__content_full-width_false > div.grid__main.grid__main_sticky_right.grid__main_full-width_false > div > div > div > article > div.article__body > div > p',
      '#main > div > div > div.grid__section.grid__section_behavior_static.grid__section_theme_article > div.grid__content.grid__content_full-width_false > div.grid__main.grid__main_sticky_right.grid__main_full-width_false > div > div > div > article > h1',
    ];
  } else if (url.indexOf('9to5mac') != -1) {
    return [
      'h2.wp-block-heading',
      '#content > div.container.med.post-content > p',
      '#main > div.container > div > h1',
    ];
  } else if (url.indexOf('www.abc.net.au') != -1) {
    if (url.indexOf('/news/') != -1) {
      return [
        '#content > article > div > div > div > div > h2',
        '#content > article > div > div > div > div > p',
        '#content > article > div > div > div > div.ArticleHeadlineTitle_container__f00HU > h1',
      ];
    } else {
      return [
        '#content > article > div > div > div > div > h2',
        '#content > div > div > div > div > article > div > div > div > div > p',
        '#heroImageWithCTA > div.Container_container__ATkiX.Container_spacing-top-variant-standard__YWgjA > div > div > div > div.HeroImageWithCTA_bodyContainer__ecbxD > div > h1 > div',
      ];
    }
  } else if (url.indexOf('abplive.com') != -1) {
    if (url.indexOf('com/videos/') == -1) {
      return [
        '#article-hstick-inner > h3',
        '#article-hstick-inner > p',
        '#main > div > div > section.column_2 > section > section.column-content > section.abp-article > h1',
      ];
    } else {
      return [
        '#main > div > div > section.column_2 > section > section.column-content > section.abp-article > h2',
        '#article-hstick-inner > div > div.video-article-story-slug > div',
        '#article-hstick-inner > div > h1',
      ];
    }
  } else if (url.indexOf('www.bbc') != -1) {
    if (url.indexOf('/thai/') != -1) {
      return [
        '#main-wrapper > div > div > div > div.bbc-1cvxiy9 > main > div > h2',
        '#main-wrapper > div > div > div > div.bbc-1cvxiy9 > main > div > p',
        'h1',
      ];
    } else {
      return [
        '#main-content > article > div[data-component="subheadline-block"]',
        '#main-content > article > div[data-component="text-block"]',
        'h1',
      ];
    }
  } else if (url.indexOf('www.nytimes.com') != -1) {
    return [
      '#story > section > div > div > h2',
      '#story > section > div > div > p',
      '#story > header > div.css-1vkm6nb.ehdk2mb0 > h1',
    ];
  } else if (url.indexOf('www.reuters.com') != -1) {
    return [
      'h2',
      '#main-content > article > div.article__main__33WV2 > div > div > div > div > div',
      '#main-content > article > div.article__main__33WV2 > div > header > div > div > h1',
    ];
  } else if (url.indexOf('www.channelnewsasia.com') != -1) {
    return [
      'article > div.content > div > div.layout__region.layout__region--first > section.block.block-layout-builder.block-field-blocknodearticlefield-content.clearfix > div > div > div > div > h2',
      'article > div.content > div > div.layout__region.layout__region--first > section.block.block-layout-builder.block-field-blocknodearticlefield-content.clearfix > div > div > div > div > p',
      'article > div.content > div > div > section > div > h1',
    ];
  } else if (url.indexOf('yahoo.com') != -1) {
    if (url.indexOf('finance.yahoo') != -1) {
      return [
        '#nimbus-app > section > section > section > article > div > div.article-wrap.no-bb > div.body-wrap.yf-40hgrf > div > h2, #nimbus-app > section > section > section > article > div > div.article-wrap.no-bb > div.body-wrap.yf-40hgrf > div > div.read-more-wrapper > h2',
        '#nimbus-app > section > section > section > article > div > div.article-wrap.no-bb > div.body-wrap.yf-40hgrf > div > p, #nimbus-app > section > section > section > article > div > div.article-wrap.no-bb > div.body-wrap.yf-40hgrf > div > div.read-more-wrapper > p',
        '#nimbus-app > section > section > section > article > div > div.article-wrap.no-bb > div.cover-wrap.yf-1at0uqp > div.cover-headline.yf-1at0uqp > div',
      ];
    } else if (url.indexOf('news.yahoo') != -1) {
      return [
        '#module-article > div > div > article > div > div > div > div > div > div > div > div > div.caas-body > h2',
        '#module-article > div > div > article > div > div > div > div > div > div > div > div > div.caas-body > p',
        '#module-article > div > div > article > div > div > div > div > div > div > div > div > header > div.caas-title-wrapper > h1',
      ];
    } else if (url.indexOf('sports.yahoo') != -1) {
      return [
        '#module-article > div  > div > article > div > div > div > div > div > div > div.caas-body > h2',
        '#module-article > div  > div > article > div > div > div > div > div > div > div.caas-body > p',
        '#module-article > div  > div > article > div > div > div > div > div > div > header > div.caas-title-wrapper > h1',
      ];
    } else if (url.indexOf('style.yahoo') != -1) {
      return [
        '#module-article > div > div > article > div > div > div > div > div > div > div > div > div.caas-body > h2',
        '#module-article > div > div > article > div > div > div > div > div > div > div > div > div.caas-body > p',
        '#module-article > div > div > article > div > div > div > div > div > div > div > div > header > div.caas-title-wrapper > h1',
      ];
    } else if (url.indexOf('www.yahoo.com') != -1) {
      return [
        'main > div > div:nth-child(1) > article > div > div > div > div > div > div.grid.grid-cols-article-mobile.md\\:max-w-\\[750px\\].md\\:grid-cols-article.overflow-hidden > div > div > h2',
        'main > div > div:nth-child(1) > article > div > div > div > div > div > div.grid.grid-cols-article-mobile.md\\:max-w-\\[750px\\].md\\:grid-cols-article.overflow-hidden > div > div > p',
        'main > div > div:nth-child(1) > article > div > div > div > div > div > header > h1',
      ];
    } else {
      return ['h2', 'p', 'h1'];
    }
  } else if (url.indexOf('www.thebangkokinsight.com') != -1) {
    return [
      '#page > div > div.site-content.single-entry > div.mnmd-block.mnmd-block--fullwidth.single-entry-wrap > div > div > div.mnmd-main-col > article > div > div.single-body.entry-content.typography-copy > h2, #page > div > div.site-content.single-entry > div.mnmd-block.mnmd-block--fullwidth.single-entry-wrap > div > div > div.mnmd-main-col > article > div > div.single-body.entry-content.typography-copy > h3',
      '#page > div > div.site-content.single-entry > div.mnmd-block.mnmd-block--fullwidth.single-entry-wrap > div > div > div.mnmd-main-col > article > div > div.single-body.entry-content.typography-copy > p, #page > div > div.site-content.single-entry > div.mnmd-block.mnmd-block--fullwidth.single-entry-wrap > div > div > div.mnmd-main-col > article > div > div.single-body.entry-content.typography-copy > div',
      '#page > div > div.site-content.single-entry > div.mnmd-block.mnmd-block--fullwidth.single-entry-wrap > div > div > div.mnmd-main-col > article > div > header > h1',
    ];
  } else if (url.indexOf('timesofindia.indiatimes.com') != -1) {
    return ['div.M1rHh undefined', 'div._s30J.clearfix', 'h1'];
  } else if (url.indexOf('seekingalpha.com') != -1) {
    return [
      '',
      '#content > div.flex.grow.flex-col > article > div > div > div > div.contents > div > section > div > div > div > div > div > div > div',
      '#content > div.flex.grow.flex-col > article > div > div > div > div.contents > div > section > div > div > div > header > div > h1'
    ];
  } else if (url.indexOf('inquirer.net') != -1) {
    if (url.indexOf('usa.inquirer.net') != -1) {
      return [
        '',
        '#TO_target_content',
        '#art-head-group > hgroup > h1'
      ];
    }
    else if (url.indexOf('lifestyle.inquirer.net') != -1) {
      return [
        '#content > div > div.elementor-column.elementor-col-50.elementor-top-column.elementor-element.elementor-element-d89fb65 > div > div.elementor-element.elementor-element-2afa7ee.elementor-widget.elementor-widget-theme-post-content > div > h3',
        '#content > div > div.elementor-column.elementor-col-50.elementor-top-column.elementor-element.elementor-element-d89fb65 > div > div.elementor-element.elementor-element-2afa7ee.elementor-widget.elementor-widget-theme-post-content > div > p',
        '#header > div > div > div > div.elementor-element.elementor-element-4491fc8.elementor-widget.elementor-widget-theme-post-title.elementor-page-title.elementor-widget-heading > div > h1'
      ];
    }
    else if (url.indexOf('cebudailynews.inquirer.net') != -1) {
      return [
        '#article-content > h2',
        '#article-content > p',
        'h1'
      ];
    }

    else {
      return [
        '#FOR_target_content > h2',
        '#FOR_target_content > p',
        '#art-head-group > hgroup > h1'
      ];
    }
  } else if (url.indexOf('globenewswire.com') != -1) {
    return [
      'h2',
      '#main-body-container > p',
      '#container-article > div.main-container-content > div.main-header-container > h1'
    ];
  } else if (url.indexOf('scmp.com') != -1) {
    return [
      'h2',
      '#__next > div.css-7cwzj1.e1t69p6b3 > div.css-o13c8i.e1t69p6b0 > div > article > div > div > div > div.css-wvfhp.ea45u6l28 > div.css-1nbm1qt.ea45u6l10 > section',
      '#__next > div.css-7cwzj1.e1t69p6b3 > div.css-o13c8i.e1t69p6b0 > div > article > div.css-wv6nr3.e1kvrr5t0 > div > div > div.css-3gz5kq.ea45u6l29 > div.css-hdf8vf.ea45u6l21 > h1 > span'
    ];
  } else if (url.indexOf('thenews.com.pk') != -1) {
    if (url.indexOf('thenews.com.pk/tns/') != -1) {
      return [
        '',
        'body > div.siteContent > section > div > div.detail-left > div.detail-content.detail-center > div > p',
        'body > div.siteContent > section > div > div.detail-left-top > h2'
      ];
    } else {
      return [
        '',
        'body > div.siteContent > div.container.pakistan_container > div > div.d_cci.detail_column_right > div.detail-center > div.story-detail > p',
        'body > div.siteContent > div.container.pakistan_container > div > div.detail-heading > h1'
      ];
    }
  }
  //ถ้าเป็นเว็บที่ไม่ได้เจาะจง tag จะดึงจาก tag h1, h2, p
  else {
    return ['h2', 'p', 'h1'];
  }
}


module.exports.scrapeWeb = scrapeWeb;
