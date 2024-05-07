package com.oracle.coherence.idrs;

import java.util.Set;
import java.util.concurrent.ConcurrentSkipListSet;
import java.util.concurrent.TimeUnit;

import com.oracle.coherence.common.base.Logger;

import com.tangosol.coherence.config.Config;
import com.tangosol.internal.net.topic.impl.paged.PagedTopicSubscriber;
import com.tangosol.internal.net.topic.impl.paged.model.PagedPosition;
import com.tangosol.net.Coherence;
import com.tangosol.net.Session;
import com.tangosol.net.topic.NamedTopic;
import com.tangosol.net.topic.Publisher;
import com.tangosol.net.topic.Subscriber;

@SuppressWarnings({"unchecked"})
public class SubscriberMain
        implements Constants
    {

    @SuppressWarnings("InfiniteLoopStatement")
    public static void main(String[] args) throws Exception
        {
        try (Coherence coherence = Coherence.clusterMember())
            {
            coherence.start().get(5, TimeUnit.MINUTES);

            Session                     session     = coherence.getSession();
            String                      sTopicMsg   = Config.getProperty(PROP_TOPIC, DEFAULT_TOPIC);
            String                      sTopicState = Config.getProperty(PROP_STATE_TOPIC, DEFAULT_STATE_TOPIC);
            String                      sGroup      = Config.getProperty(PROP_GROUP, DEFAULT_GROUP);
            NamedTopic<String>          topicMsg    = session.getTopic(sTopicMsg);
            NamedTopic<ChannelPosition> topicState  = session.getTopic(sTopicState);

            Logger.info("Creating subscriber");
            try (Subscriber<String> subscriber = topicMsg.createSubscriber(Subscriber.inGroup(sGroup));
                 Publisher<ChannelPosition> publisher = topicState.createPublisher(Publisher.OrderBy.value(ChannelPosition::getChannel)))
                {
                PagedTopicSubscriber<String> pagedTopicSubscriber = (PagedTopicSubscriber<String>) subscriber;

                Logger.info("Entering subscriber loop");
                m_fRunning = true;
                while (true)
                    {
                    Subscriber.Element<String> element   = subscriber.receive().get();
                    PagedPosition              position  = (PagedPosition) element.getPosition();
                    int[]                      anChannel = subscriber.getChannels();
                    Publisher.Status           status    = publisher.publish(new ChannelPosition(element.getChannel(), position, pagedTopicSubscriber.getSubscriberId(), anChannel)).get();
                    Subscriber.CommitResult result = element.commit();
                    Logger.info("Processed channel=" + element.getChannel() + " " + position + " result=" + result + " status=" + status);
                    m_cMessage++;
//                    if (m_cMessage % 100 == 0)
//                        {
//                        Logger.info("Received " + m_cMessage + "messages");
//                        }
                    }
                }
            }
        }

    // ----- data members ---------------------------------------------------

    private static long m_cMessage;

    private static boolean m_fRunning;

    private static final Set<Integer> m_setChannel = new ConcurrentSkipListSet<>();
    }
