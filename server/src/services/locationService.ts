import prisma from '../config/database.js';
import type { CreateLocationInput, UpdateLocationInput } from '../validators/location.js';

export async function createLocation(userId: string, input: CreateLocationInput) {
  return prisma.location.create({
    data: {
      userId,
      ...input,
    },
  });
}

export async function getUserLocations(userId: string) {
  return prisma.location.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLocationById(userId: string, locationId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, userId },
  });

  if (!location) {
    const error = new Error('Location not found') as Error & { statusCode: number; code: string };
    error.statusCode = 404;
    error.code = 'LOCATION_NOT_FOUND';
    throw error;
  }

  return location;
}

export async function updateLocation(userId: string, locationId: string, input: UpdateLocationInput) {
  await getLocationById(userId, locationId);

  return prisma.location.update({
    where: { id: locationId },
    data: input,
  });
}

export async function deleteLocation(userId: string, locationId: string) {
  await getLocationById(userId, locationId);
  await prisma.location.delete({ where: { id: locationId } });
}
