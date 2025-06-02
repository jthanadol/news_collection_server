class NewsResponse {

    constructor(news_id, title, description, img_url, news_url, pub_date, source_name, source_icon, title_th, description_th, fact_check, fact_check_th, content_th, content, audio_th, audio_en) {
        this.news_id = news_id
        this.title = title
        this.description = description
        this.img_url = img_url
        this.news_url = news_url
        this.pub_date = pub_date
        this.source_name = source_name
        this.source_icon = source_icon
        this.title_th = title_th
        this.description_th = description_th
        this.fact_check = fact_check
        this.fact_check_th = fact_check_th
        this.content = content
        this.content_th = content_th
        this.audio_en = audio_en
        this.audio_th = audio_th
    }
}

module.exports = NewsResponse