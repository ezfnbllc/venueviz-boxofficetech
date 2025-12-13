import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/lib/services/automationService'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const promoterId = searchParams.get('promoterId')
    const type = searchParams.get('type')

    if (!promoterId) {
      return NextResponse.json({ error: 'promoterId is required' }, { status: 400 })
    }

    let data: any

    switch (type) {
      case 'tasks':
        const taskFilters: any = {}
        if (searchParams.get('status')) taskFilters.status = searchParams.get('status')
        if (searchParams.get('taskType')) taskFilters.type = searchParams.get('taskType')
        data = await AutomationService.getScheduledTasks(promoterId, taskFilters)
        break

      case 'task':
        const taskId = searchParams.get('taskId')
        if (!taskId) {
          return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
        }
        data = await AutomationService.getTask(taskId)
        break

      case 'rules':
        const ruleFilters: any = {}
        if (searchParams.get('status')) ruleFilters.status = searchParams.get('status')
        if (searchParams.get('triggerType')) ruleFilters.triggerType = searchParams.get('triggerType')
        data = await AutomationService.getAutomationRules(promoterId, ruleFilters)
        break

      case 'rule':
        const ruleId = searchParams.get('ruleId')
        if (!ruleId) {
          return NextResponse.json({ error: 'ruleId is required' }, { status: 400 })
        }
        data = await AutomationService.getRule(ruleId)
        break

      case 'executions':
        const execTaskId = searchParams.get('taskId')
        const execRuleId = searchParams.get('ruleId')
        const execLimit = parseInt(searchParams.get('limit') || '50')
        data = await AutomationService.getExecutionHistory(execTaskId || execRuleId || '', execLimit)
        break

      case 'pending':
        data = await AutomationService.getPendingTasks()
        break

      default:
        // Return overview of all automation
        const [tasks, rules] = await Promise.all([
          AutomationService.getScheduledTasks(promoterId),
          AutomationService.getAutomationRules(promoterId),
        ])
        data = { tasks, rules }
        break
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Automation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, promoterId, userId, ...data } = body

    if (!promoterId || !userId) {
      return NextResponse.json({ error: 'promoterId and userId are required' }, { status: 400 })
    }

    let result: any

    switch (action) {
      case 'createTask':
        result = await AutomationService.createScheduledTask({
          promoterId,
          ...data.task,
        }, userId)
        break

      case 'updateTask':
        await AutomationService.updateTask(data.taskId, data.updates, userId)
        result = { success: true }
        break

      case 'pauseTask':
        await AutomationService.pauseTask(data.taskId, userId)
        result = { success: true }
        break

      case 'resumeTask':
        await AutomationService.resumeTask(data.taskId, userId)
        result = { success: true }
        break

      case 'cancelTask':
        await AutomationService.cancelTask(data.taskId, userId)
        result = { success: true }
        break

      case 'runTaskNow':
        result = await AutomationService.runTaskNow(data.taskId, userId)
        break

      case 'createRule':
        result = await AutomationService.createAutomationRule({
          promoterId,
          ...data.rule,
        }, userId)
        break

      case 'updateRule':
        await AutomationService.updateRule(data.ruleId, data.updates, userId)
        result = { success: true }
        break

      case 'activateRule':
        await AutomationService.activateRule(data.ruleId, userId)
        result = { success: true }
        break

      case 'deactivateRule':
        await AutomationService.deactivateRule(data.ruleId, userId)
        result = { success: true }
        break

      case 'testRule':
        result = await AutomationService.testRule(data.ruleId, data.testData)
        break

      case 'triggerRule':
        result = await AutomationService.triggerRule(data.ruleId, data.eventData)
        break

      case 'processPendingTasks':
        result = await AutomationService.processPendingTasks()
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Automation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
