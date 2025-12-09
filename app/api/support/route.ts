import { NextRequest, NextResponse } from 'next/server'
import { HelpDeskService } from '@/lib/services/helpDeskService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    let data: any

    switch (type) {
      case 'tickets':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const ticketFilters: any = {}
        if (searchParams.get('status')) {
          const statusParam = searchParams.get('status')!
          ticketFilters.status = statusParam.includes(',') ? statusParam.split(',') : statusParam
        }
        if (searchParams.get('priority')) ticketFilters.priority = searchParams.get('priority')
        if (searchParams.get('assigneeId')) ticketFilters.assigneeId = searchParams.get('assigneeId')
        if (searchParams.get('customerId')) ticketFilters.customerId = searchParams.get('customerId')
        if (searchParams.get('category')) ticketFilters.category = searchParams.get('category')
        if (searchParams.get('channel')) ticketFilters.channel = searchParams.get('channel')
        if (searchParams.get('search')) ticketFilters.search = searchParams.get('search')
        if (searchParams.get('startDate') && searchParams.get('endDate')) {
          ticketFilters.dateRange = {
            start: new Date(searchParams.get('startDate')!),
            end: new Date(searchParams.get('endDate')!),
          }
        }
        data = await HelpDeskService.getTickets(promoterId, ticketFilters)
        break

      case 'ticket':
        const ticketId = searchParams.get('ticketId')
        if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 })
        data = await HelpDeskService.getTicket(ticketId)
        break

      case 'slaPolicies':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        data = await HelpDeskService.getSLAPolicies(promoterId)
        break

      case 'cannedResponses':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const category = searchParams.get('category') || undefined
        data = await HelpDeskService.getCannedResponses(promoterId, category)
        break

      case 'articles':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const articleFilters: any = {}
        if (searchParams.get('status')) articleFilters.status = searchParams.get('status')
        if (searchParams.get('visibility')) articleFilters.visibility = searchParams.get('visibility')
        if (searchParams.get('articleCategory')) articleFilters.category = searchParams.get('articleCategory')
        if (searchParams.get('search')) articleFilters.search = searchParams.get('search')
        data = await HelpDeskService.getArticles(promoterId, articleFilters)
        break

      case 'article':
        const articleId = searchParams.get('articleId')
        if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 })
        data = await HelpDeskService.getArticle(articleId)
        break

      case 'searchKnowledgeBase':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const query_param = searchParams.get('query')
        if (!query_param) return NextResponse.json({ error: 'query required' }, { status: 400 })
        data = await HelpDeskService.searchKnowledgeBase(promoterId, query_param)
        break

      case 'chatSession':
        const sessionId = searchParams.get('sessionId')
        if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        data = await HelpDeskService.getChatSession(sessionId)
        break

      case 'metrics':
        if (!promoterId) return NextResponse.json({ error: 'promoterId required' }, { status: 400 })
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        if (!startDate || !endDate) {
          return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 })
        }
        data = await HelpDeskService.getTicketMetrics(promoterId, {
          start: new Date(startDate),
          end: new Date(endDate),
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Help desk error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let result: any

    switch (action) {
      case 'createTicket':
        result = await HelpDeskService.createTicket(data.ticket)
        break

      case 'updateTicket':
        await HelpDeskService.updateTicket(
          data.ticketId, data.updates, data.actorId, data.actorName
        )
        result = { success: true }
        break

      case 'addMessage':
        result = await HelpDeskService.addMessage(data.ticketId, data.message)
        break

      case 'assignTicket':
        await HelpDeskService.assignTicket(data.ticketId, data.assignee)
        result = { success: true }
        break

      case 'unassignTicket':
        await HelpDeskService.unassignTicket(data.ticketId)
        result = { success: true }
        break

      case 'mergeTickets':
        await HelpDeskService.mergeTickets(
          data.primaryTicketId, data.secondaryTicketIds, data.actorId, data.actorName
        )
        result = { success: true }
        break

      case 'submitSatisfaction':
        await HelpDeskService.submitSatisfaction(data.ticketId, data.rating, data.comment)
        result = { success: true }
        break

      case 'createSLAPolicy':
        result = await HelpDeskService.createSLAPolicy(data.policy)
        break

      case 'createCannedResponse':
        result = await HelpDeskService.createCannedResponse(data.response)
        break

      case 'useCannedResponse':
        result = { content: await HelpDeskService.useCannedResponse(data.responseId, data.variables) }
        break

      case 'createArticle':
        const articleData = {
          ...data.article,
          publishedAt: data.article.publishedAt ? new Date(data.article.publishedAt) : undefined,
        }
        result = await HelpDeskService.createArticle(articleData)
        break

      case 'recordArticleView':
        await HelpDeskService.recordArticleView(data.articleId)
        result = { success: true }
        break

      case 'recordArticleFeedback':
        await HelpDeskService.recordArticleFeedback(data.articleId, data.helpful)
        result = { success: true }
        break

      case 'startChatSession':
        result = await HelpDeskService.startChatSession(data.session)
        break

      case 'acceptChatSession':
        await HelpDeskService.acceptChatSession(data.sessionId, data.agent)
        result = { success: true }
        break

      case 'sendChatMessage':
        result = await HelpDeskService.sendChatMessage(data.sessionId, data.message)
        break

      case 'endChatSession':
        await HelpDeskService.endChatSession(data.sessionId)
        result = { success: true }
        break

      case 'clearCache':
        HelpDeskService.clearCache()
        result = { success: true }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Help desk error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
