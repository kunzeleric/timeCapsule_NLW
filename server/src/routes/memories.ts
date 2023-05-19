/* eslint-disable prettier/prettier */
import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

export async function memoriesRoutes(app: FastifyInstance) {

  // preHandler (antes de executar os handlers, verifica se o usuário está autenticado)
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify() // traz informacoes configuradas do usuario logado para verificacao
  })

  // listagem das memorias
  app.get('/memories', async (request) => {

    const memories = await prisma.memory.findMany({
      where:{
        userId: request.user.sub, // compara o id do usuario com a request feita
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return memories.map((memory) => {
      return {
        id: memory.id,
        coverUrl: memory.coverUrl,
        excerpt: memory.content.substring(0, 115).concat('...'),
      }
    })
  })

  // listagem de uma memoria
  app.get('/memories/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      }
    })
    // se a memoria não for publica e o id do usuário da memoria criada não for igual do usuário logado, então retorna erro 401
    if(!memory.isPublic && memory.userId !== request.user.sub){
      return reply.status(401).send()
    }

    return memory
  })

  // criacao de uma memoria
  app.post('/memories', async (request) => {
    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    })

    const { content, isPublic, coverUrl } = bodySchema.parse(request.body)

    const memory = await prisma.memory.create({
      data: {
        content,
        coverUrl,
        isPublic,
        userId: request.user.sub
      }
    })

    return memory
  })

  // atualizacao de uma memoria
  app.put('/memories/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      content: z.string(),
      coverUrl: z.string(),
      isPublic: z.coerce.boolean().default(false),
    })

    const { content, isPublic, coverUrl } = bodySchema.parse(request.body)

    let memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      }
    })

    if(memory.userId !== request.user.sub){
      return reply.status(401).send()
    }

    memory = await prisma.memory.update({
      where:{
        id,
      },
      data: {
        content,
        coverUrl,
        isPublic,
      }
    })

    return memory

  })

  // deletar uma memoria
  app.delete('/memories/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const memory = await prisma.memory.findUniqueOrThrow({
      where: {
        id,
      }
    })

    if(memory.userId !== request.user.sub){
      return reply.status(401).send()
    }

    await prisma.memory.delete({
      where: {
        id,
      }
    })
  })
}
