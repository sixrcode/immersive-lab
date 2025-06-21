import React from 'react';
import { Tutorial } from 'packages/types/src/tutorial.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TutorialCardProps {
  tutorial: Tutorial;
}

const TutorialCard: React.FC<TutorialCardProps> = ({ tutorial }) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg">{tutorial.title}</CardTitle>
        {tutorial.author && <CardDescription>By: {tutorial.author}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow">
        {tutorial.thumbnailUrl && (
          <img src={tutorial.thumbnailUrl} alt={tutorial.title} className="rounded-md mb-4 w-full h-48 object-cover" />
        )}
        <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{tutorial.description || 'No description available.'}</p>
        <div className="space-x-2 mb-2">
          <Badge variant="outline">{tutorial.category}</Badge>
          <Badge variant="secondary">{tutorial.difficulty}</Badge>
        </div>
        {tutorial.tags && tutorial.tags.length > 0 && (
          <div className="mt-2">
            {tutorial.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="mr-1 mb-1 text-xs">{tag}</Badge>
            ))}
            {tutorial.tags.length > 3 && <Badge variant="outline" className="text-xs">...</Badge>}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <a
          href={tutorial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          View Tutorial
        </a>
        <div className="text-xs text-muted-foreground">
          <p>Published: {new Date(tutorial.publishDate).toLocaleDateString()}</p>
          <p>Popularity: {tutorial.popularity}</p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TutorialCard;
